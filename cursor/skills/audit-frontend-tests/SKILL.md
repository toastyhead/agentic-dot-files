---
name: audit-frontend-tests
description: Audit frontend test changes for brittle, redundant, duplicated, implementation-coupled, over-mocked, or low-value coverage. Use when reviewing a PR's tests, scanning changed Vitest/Jest/React Testing Library/Playwright files, investigating excessive test generation, deciding whether proposed coverage is necessary, or identifying tests to keep, consolidate, rewrite, or remove. The normal workflow is read-only and never creates or changes tests without explicit user approval.
---

# Audit Frontend Tests

Audit tests as maintained product code. Use static signals to focus review, then decide from the protected contract and regression risk. Never treat a pattern match as proof that a test is bad.

## Preserve the approval boundary

- Run, inspect, and report on existing tests without additional approval.
- Never create a new test case or file, or materially expand an existing case, unless the user explicitly approves test creation for the current task.
- Do not infer test approval from a request to implement, fix, refactor, review, validate, browser-test, or address a regression.
- After approval, still require the proposed test to protect a distinct observable contract, cover material risk, add missing coverage, fail on the pre-change behavior, use the lowest-cost reliable layer, and survive a behavior-preserving refactor.
- Do not delete, consolidate, or rewrite tests during an audit unless the user explicitly asks for those changes.
- Keep the skill and generated audit output local. Do not copy them into a repository, stage them, commit them, publish them, or comment on a PR unless explicitly asked.

## Establish scope

1. Read all applicable `AGENTS.md` and `CLAUDE.md` files before reviewing tests.
2. Confirm the repository and current branch without checking out or creating a branch.
3. Choose the audit set:
   - PR or branch audit: changed test files relative to the live base ref.
   - Working-tree audit: staged, unstaged, and untracked test files.
   - Targeted audit: user-specified test files or suites.
   - Repository audit: all test files only when the user explicitly requests broad coverage.
4. Use read-only Git or GitHub commands. Re-fetch PR metadata when current PR state matters, but never post comments or resolve threads unless requested.

## Run the static scan

Run the bundled scanner from this skill directory:

```bash
python3 scripts/scan_frontend_tests.py --repo /absolute/path/to/repo --base upstream/develop
```

For targeted files, repeat `--path`:

```bash
python3 scripts/scan_frontend_tests.py \
  --repo /absolute/path/to/repo \
  --path src/tests/example.test.tsx \
  --path tests/example.spec.ts
```

Use `--all` only for an explicitly requested repository-wide audit. The scanner reports signals and exits without modifying files. Treat zero static signals as "no pattern detected," not as proof of test quality.

## Review each protected contract

For every test or group of equivalent cases:

1. Name the observable contract in one sentence. If the sentence describes component structure, source text, mock choreography, or an internal helper rather than user/API behavior, flag it.
2. Name the material regression prevented. Cosmetic drift or harmless refactoring is not enough by default.
3. Search nearby and repository-wide tests for the same contract. Distinguish duplicate coverage from complementary layers.
4. Check the counterfactual: would the test fail on the pre-change bug? Would it remain green after a behavior-preserving refactor?
5. Check whether a cheaper layer can protect the contract with less setup.
6. Review determinism and isolation: shared mutable fixtures, order dependence, real time, randomness, hard waits, leaked mocks, and environment dependence.
7. Review user orientation: prefer roles, labels, visible state, public inputs/outputs, errors, and durable side effects over DOM shape, CSS classes, private state, or call order.
8. Review mocking: mock only slow, nondeterministic, external, or side-effecting boundaries. Flag tests whose fixtures and mocks dominate the behavior under test.
9. Consolidate equivalent input permutations conceptually with `it.each` or `test.each`; do not count each permutation as a distinct contract.

## Interpret scanner signals

- **Source inspection:** tests read source files or match implementation text. Usually replace with behavior-level evidence.
- **DOM or styling coupling:** class names, query selectors, parent/child order, pixels, or exact styles. Keep only when that detail is an accessibility or documented product contract.
- **Mock-interaction coupling:** exact call count, call order, or intermediate payload sequence. Verify whether the assertion covers a public boundary or merely current implementation choreography.
- **Snapshot dependence:** snapshots can supplement a focused assertion, but snapshot-only protection rarely explains the contract.
- **Hard waits and ambient inputs:** fixed delays, current time, or randomness are flake risks unless controlled.
- **High setup density:** large files, many mocks, or very high lines per case are review smells, not automatic failures.
- **Duplicate titles:** inspect for copied or redundant cases; equal titles alone do not prove equal contracts.

## Assign evidence-based verdicts

Use one verdict per distinct contract:

- `Keep`: protects material observable behavior at an appropriate layer with resilient assertions.
- `Consolidate`: valuable behavior is repeated through equivalent cases or layers.
- `Rewrite`: valuable contract exists, but current assertions or setup are brittle.
- `Remove candidate`: no distinct material contract, already-covered behavior, or pure implementation/cosmetic coupling.
- `Inconclusive`: evidence is insufficient; state the exact runtime or product information needed.

Never remove a test solely because it is long, mocked, or statically flagged.

## Report the audit

Lead with the outcome and include:

1. Scope: base/head or explicit file set, current branch, and whether the working tree was included.
2. Totals: test files, approximate cases, lines, static signals, and changed-test share when available.
3. Findings ordered by impact, with absolute file path and line, verdict, protected contract, evidence, and suggested action.
4. A compact inventory of `Keep`, `Consolidate`, `Rewrite`, `Remove candidate`, and `Inconclusive` counts.
5. False-positive caveats and any unverified runtime assumptions.
6. An explicit statement that no tests were modified unless the user authorized changes.

When no actionable issues remain, say so directly and list the scope and checks performed.
