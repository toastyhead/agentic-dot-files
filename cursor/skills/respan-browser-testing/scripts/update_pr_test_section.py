#!/usr/bin/env python3
"""Safely update a managed browser-testing block in the current PR body."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


START_MARKER = "<!-- codex-respan-browser-testing:start -->"
END_MARKER = "<!-- codex-respan-browser-testing:end -->"
TEST_HEADING_RE = re.compile(
    r"(?im)^##\s+(?:test|tests|testing|test plan)\s*$"
)
NEXT_H2_RE = re.compile(r"(?m)^##\s+")


def run(command: list[str], cwd: Path) -> str:
    result = subprocess.run(
        command,
        cwd=cwd,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"{' '.join(command[:3])} failed: {message}")
    return result.stdout.strip()


def build_block(args: argparse.Namespace, head_sha: str) -> str:
    rows = [
        START_MARKER,
        "### Browser regression testing",
        "",
        f"- Scope: {args.scope}",
        f"- Server: `{args.server}`",
        "- API: `staging-api.respan.ai`",
        f"- Tested commit: `{head_sha}`",
        "- Results:",
    ]
    for result in args.passed:
        rows.append(f"  - Passed: {result}")
    for result in args.failed:
        rows.append(f"  - Failed: {result}")
    for result in args.blocked:
        rows.append(f"  - Blocked/Inconclusive: {result}")
    if args.automated:
        rows.append("- Automated checks:")
        rows.extend(f"  - {result}" for result in args.automated)
    if args.notes:
        rows.append(f"- Notes: {args.notes}")
    rows.append(END_MARKER)
    return "\n".join(rows)


def update_body(body: str, block: str) -> str:
    managed_re = re.compile(
        rf"{re.escape(START_MARKER)}.*?{re.escape(END_MARKER)}",
        re.DOTALL,
    )
    if managed_re.search(body):
        return managed_re.sub(block, body, count=1).rstrip() + "\n"

    heading_match = TEST_HEADING_RE.search(body)
    if heading_match:
        section_start = heading_match.end()
        next_heading = NEXT_H2_RE.search(body, section_start)
        insertion = next_heading.start() if next_heading else len(body)
        before = body[:insertion].rstrip()
        after = body[insertion:].lstrip()
        updated = f"{before}\n\n{block}"
        if after:
            updated += f"\n\n{after}"
        return updated.rstrip() + "\n"

    prefix = body.rstrip()
    if prefix:
        prefix += "\n\n"
    return f"{prefix}## Testing\n\n{block}\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update the managed Browser regression testing block in the current PR."
    )
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--scope", required=True)
    parser.add_argument("--server", required=True)
    parser.add_argument("--passed", action="append", default=[])
    parser.add_argument("--failed", action="append", default=[])
    parser.add_argument("--blocked", action="append", default=[])
    parser.add_argument("--automated", action="append", default=[])
    parser.add_argument("--notes")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not (args.passed or args.failed or args.blocked):
        parser.error("provide at least one --passed, --failed, or --blocked result")
    return args


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    local_head = run(["git", "rev-parse", "HEAD"], repo_root)
    pr = json.loads(
        run(
            ["gh", "pr", "view", "--json", "number,url,body,headRefOid"],
            repo_root,
        )
    )
    if pr["headRefOid"] != local_head:
        raise RuntimeError(
            "PR head does not match tested local HEAD; commit and push before posting results"
        )

    block = build_block(args, local_head)
    updated_body = update_body(pr.get("body") or "", block)
    if not args.apply:
        print(updated_body)
        print("Dry run only; pass --apply to update the PR.", file=sys.stderr)
        return 0

    run(
        ["gh", "pr", "edit", str(pr["number"]), "--body", updated_body],
        repo_root,
    )
    verified = json.loads(
        run(["gh", "pr", "view", "--json", "body,headRefOid,url"], repo_root)
    )
    if verified["headRefOid"] != local_head or block not in (verified.get("body") or ""):
        raise RuntimeError("live PR verification did not match the tested head and block")
    print(f"Updated PR #{pr['number']}: {verified['url']}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
