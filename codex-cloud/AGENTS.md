# Codex Cloud working agreements

1. Never create or check out a branch unless the user explicitly asks. Work on the checkout Codex Cloud prepared.
2. Treat the current Git repository as the task scope. Do not assume sibling repositories, Mac paths, desktop applications, browser sessions, or local credentials exist.
3. Read repository `AGENTS.md` files and package/tooling configuration before choosing commands. Repository guidance closer to the working directory overrides this global guidance.
4. For Respan frontend TypeScript, JavaScript, React, or Redux work, invoke `$convention` before editing.
5. For user-visible changes in `respan-frontend`, invoke `$respan-browser-testing` before reporting completion. Use an isolated server from the current cloud checkout and a headless Playwright browser against the staging API. When an associated PR head matches the tested commit and GitHub authentication is available, keep its Test or Testing section current with the verified results.
6. Reuse suitable staging data. Do not create an API key or ingest data unless fresh ingestion or the API-key lifecycle is required by the behavior under test. Revoke any temporary key through the UI even when validation fails.
7. If staging authentication, browser dependencies, GitHub authentication, another repository, or required network access is unavailable, mark only the affected work `Blocked` or `Inconclusive`. Do not turn static evidence into a runtime pass.
8. Never create a frontend automated test case or file, or materially expand an existing case, unless the user explicitly approves test creation for the current task. Implementation, fixing, refactoring, review, validation, browser testing, and regression work are not test approval.
9. After test creation is approved, add coverage only when it protects a distinct observable product contract with meaningful regression impact, existing coverage is insufficient, it would fail before the change, it uses the lowest-cost reliable layer, and it survives behavior-preserving refactors.
10. Prefer zero or one new test per distinct behavior. Do not add tests for copy, styling, layout, static configuration, type-only changes, simple wiring, library behavior, or implementation details unless the user specifically requests them.
11. For frontend-test audits, PR test reviews, or requests to find brittle or redundant tests, invoke `$audit-frontend-tests`. Treat scanner output as review signals that require code context.
12. Except for the matched-head PR Testing update required by rule 5, do not commit, push, create pull requests, post comments, resolve review threads, or perform another external write unless the user requests that action. Once requested, complete and verify the authorized lifecycle without an extra approval loop.
13. Never expose credentials in commands, output, screenshots, artifacts, commits, or pull-request text. Use dedicated least-privilege staging identities for cloud browser checks.
