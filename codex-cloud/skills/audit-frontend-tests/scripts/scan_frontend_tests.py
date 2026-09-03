#!/usr/bin/env python3
"""Read-only static audit of frontend test files.

The scanner intentionally reports review signals rather than pass/fail verdicts.
It never writes to the repository.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


TEST_PATH_RE = re.compile(
    r"(?:^|/)(?:tests?|__tests__)(?:/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$",
    re.IGNORECASE,
)
CASE_RE = re.compile(
    r"\b(?:it|test)(?:\.(?:only|skip|todo|concurrent|each))*\s*\(",
    re.MULTILINE,
)
TITLE_RE = re.compile(
    r"\b(?:it|test)(?:\.(?:only|skip|todo|concurrent))*\s*\(\s*"
    r"(?P<quote>['\"`])(?P<title>.+?)(?P=quote)",
)


@dataclass(frozen=True)
class SignalRule:
    label: str
    pattern: re.Pattern[str]
    explanation: str


SIGNAL_RULES = (
    SignalRule(
        "source inspection",
        re.compile(r"\b(?:readFileSync|readFile|createReadStream)\s*\(|\bfs\.(?:readFile|readFileSync)\b"),
        "reads source or file text instead of exercising behavior",
    ),
    SignalRule(
        "DOM/style coupling",
        re.compile(
            r"\b(?:querySelector|querySelectorAll|closest)\s*\(|"
            r"\b(?:parentElement|previousElementSibling|nextElementSibling|childNodes)\b|"
            r"\b(?:toHaveClass|toHaveStyle|getComputedStyle)\s*\(|"
            r"nth-(?:child|of-type)|xpath=|\.locator\(\s*['\"][.#\[]"
        ),
        "asserts DOM structure, CSS selectors, or styling details",
    ),
    SignalRule(
        "snapshot assertion",
        re.compile(r"\btoMatch(?:Inline)?Snapshot\s*\("),
        "uses a snapshot that may obscure the protected contract",
    ),
    SignalRule(
        "mock interaction assertion",
        re.compile(
            r"\b(?:toHaveBeenCalledTimes|toHaveBeenCalledWith|toHaveBeenNthCalledWith|"
            r"toHaveBeenLastCalledWith)\s*\(|\.mock\.(?:calls|invocationCallOrder)\b"
        ),
        "asserts mock choreography that may be an implementation detail",
    ),
    SignalRule(
        "hard wait",
        re.compile(r"\b(?:waitForTimeout|sleep)\s*\(\s*\d+|new Promise\s*\([^\n]*setTimeout"),
        "uses a fixed delay that can create slow or flaky behavior",
    ),
    SignalRule(
        "ambient time/randomness",
        re.compile(r"\b(?:Date\.now|Math\.random)\s*\(|\bnew Date\s*\(\s*\)"),
        "depends on ambient time or randomness unless explicitly controlled",
    ),
)

MOCK_RE = re.compile(
    r"\b(?:vi|jest)\.(?:mock|doMock|fn|spyOn|mocked)\s*\(|\bmock[A-Z][A-Za-z0-9_]*\b"
)


@dataclass
class FileAudit:
    path: str
    line_count: int
    case_count: int
    mock_mentions: int
    signals: dict[str, list[int]]
    titles: list[tuple[str, int]]


def run_git(repo: Path, args: list[str], *, check: bool = True) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {message}")
    return result.stdout


def is_test_path(path: str) -> bool:
    return bool(TEST_PATH_RE.search(path.replace("\\", "/")))


def normalize_paths(repo: Path, paths: Iterable[str]) -> set[str]:
    normalized: set[str] = set()
    for value in paths:
        candidate = Path(value)
        if candidate.is_absolute():
            try:
                candidate = candidate.resolve().relative_to(repo.resolve())
            except ValueError as error:
                raise RuntimeError(f"path is outside repository: {value}") from error
        relative = candidate.as_posix().lstrip("./")
        if is_test_path(relative):
            normalized.add(relative)
    return normalized


def existing_ref(repo: Path, ref: str) -> bool:
    result = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def choose_base(repo: Path, requested: str | None) -> str | None:
    if requested:
        if not existing_ref(repo, requested):
            raise RuntimeError(f"base ref does not exist: {requested}")
        return requested

    for candidate in (
        "upstream/develop",
        "origin/develop",
        "develop",
        "upstream/main",
        "origin/main",
        "main",
    ):
        if existing_ref(repo, candidate):
            return candidate
    return None


def collect_paths(
    repo: Path,
    *,
    base: str | None,
    explicit_paths: list[str],
    scan_all: bool,
) -> set[str]:
    if explicit_paths:
        return normalize_paths(repo, explicit_paths)

    if scan_all:
        tracked = run_git(repo, ["ls-files"]).splitlines()
        untracked = run_git(repo, ["ls-files", "--others", "--exclude-standard"]).splitlines()
        return {path for path in tracked + untracked if is_test_path(path)}

    changed: set[str] = set()
    if base:
        changed.update(
            run_git(
                repo,
                ["diff", "--name-only", "--diff-filter=ACMR", f"{base}...HEAD", "--"],
            ).splitlines()
        )
    changed.update(
        run_git(repo, ["diff", "--name-only", "--diff-filter=ACMR", "HEAD", "--"]).splitlines()
    )
    changed.update(run_git(repo, ["ls-files", "--others", "--exclude-standard"]).splitlines())
    return {path for path in changed if is_test_path(path)}


def line_numbers(text: str, pattern: re.Pattern[str]) -> list[int]:
    return [text.count("\n", 0, match.start()) + 1 for match in pattern.finditer(text)]


def analyze_file(repo: Path, relative_path: str) -> FileAudit | None:
    path = repo / relative_path
    if not path.is_file():
        return None
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="replace")

    lines = text.splitlines()
    signals = {
        rule.label: line_numbers(text, rule.pattern)
        for rule in SIGNAL_RULES
        if rule.pattern.search(text)
    }
    titles = [
        (match.group("title").strip(), text.count("\n", 0, match.start()) + 1)
        for match in TITLE_RE.finditer(text)
    ]
    return FileAudit(
        path=relative_path,
        line_count=len(lines),
        case_count=len(CASE_RE.findall(text)),
        mock_mentions=len(MOCK_RE.findall(text)),
        signals=signals,
        titles=titles,
    )


def density_flags(audit: FileAudit) -> list[str]:
    flags: list[str] = []
    if audit.line_count >= 500:
        flags.append(f"large file ({audit.line_count} lines)")
    if audit.case_count and audit.line_count / audit.case_count >= 100:
        flags.append(f"high setup density ({audit.line_count / audit.case_count:.0f} lines/case)")
    if audit.mock_mentions >= 20:
        flags.append(f"high mock density ({audit.mock_mentions} mentions)")
    if audit.case_count == 0:
        flags.append("no statically recognized test cases")
    return flags


def markdown_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def render_report(repo: Path, base: str | None, audits: list[FileAudit]) -> str:
    lines = [
        "# Frontend test audit",
        "",
        f"- Repository: `{repo}`",
        f"- Base: `{base}`" if base else "- Base: none; scanned working-tree changes",
        f"- Test files: {len(audits)}",
        f"- Approximate test declarations: {sum(a.case_count for a in audits)}",
        f"- Test lines: {sum(a.line_count for a in audits)}",
        f"- Mock mentions: {sum(a.mock_mentions for a in audits)}",
        "",
        "> Static matches are review signals, not proof that a test is brittle or should be removed.",
        "",
    ]
    if not audits:
        lines.append("No matching test files were found in the selected scope.")
        return "\n".join(lines)

    lines.extend(
        [
            "## File signals",
            "",
            "| File | Cases | Lines | Mocks | Signals |",
            "|---|---:|---:|---:|---|",
        ]
    )
    for audit in audits:
        signal_text = []
        for label, matched_lines in audit.signals.items():
            sample = ",".join(str(line) for line in matched_lines[:5])
            suffix = ",…" if len(matched_lines) > 5 else ""
            signal_text.append(f"{label} @ {sample}{suffix}")
        signal_text.extend(density_flags(audit))
        lines.append(
            "| "
            + " | ".join(
                (
                    f"`{markdown_escape(audit.path)}`",
                    str(audit.case_count),
                    str(audit.line_count),
                    str(audit.mock_mentions),
                    markdown_escape("; ".join(signal_text) or "none detected"),
                )
            )
            + " |"
        )

    duplicate_titles: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for audit in audits:
        for title, line in audit.titles:
            duplicate_titles[title.casefold()].append((audit.path, line))
    duplicates = {
        title: locations
        for title, locations in duplicate_titles.items()
        if len(locations) > 1
    }
    if duplicates:
        lines.extend(["", "## Duplicate title signals", ""])
        for normalized_title, locations in sorted(duplicates.items()):
            rendered = ", ".join(f"`{path}:{line}`" for path, line in locations)
            lines.append(f"- `{markdown_escape(normalized_title)}`: {rendered}")

    lines.extend(
        [
            "",
            "## Manual review required",
            "",
            "For each signal, identify the observable contract, material regression risk, existing coverage, pre-change failure, cheapest reliable layer, and whether the assertion survives a behavior-preserving refactor.",
            "Do not edit or remove tests based on this report alone.",
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Report static brittleness and redundancy signals in frontend tests without modifying files."
    )
    parser.add_argument("--repo", default=".", help="Git repository to scan (default: current directory).")
    parser.add_argument("--base", help="Base ref for changed-file selection (auto-detected when omitted).")
    parser.add_argument(
        "--path",
        action="append",
        default=[],
        help="Specific test path to scan; repeat for multiple files.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Scan all tracked and untracked test files instead of changed files.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = Path(args.repo).expanduser().resolve()
    if not repo.is_dir():
        print(f"error: repository directory does not exist: {repo}", file=sys.stderr)
        return 2
    try:
        run_git(repo, ["rev-parse", "--is-inside-work-tree"])
        base = choose_base(repo, args.base)
        selected = collect_paths(
            repo,
            base=base,
            explicit_paths=args.path,
            scan_all=args.all,
        )
        audits = [
            audit
            for relative_path in sorted(selected)
            if (audit := analyze_file(repo, relative_path)) is not None
        ]
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    print(render_report(repo, base, audits))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
