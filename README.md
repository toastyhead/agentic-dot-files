# Agentic dot files

This repository is a one-time, sanitized backup of Rizwan's local agent
instructions, custom skills, workspace scripts, and Playwright harness captured
on August 24, 2026.

It intentionally stores only automation that was not already backed up by the
Respan repositories. It is not a scheduled sync, and none of the source
workspaces were turned into Git repositories to create this snapshot.

## Contents

| Path | Purpose |
| --- | --- |
| `codex/AGENTS.md` | Global Codex rules, including branch and browser-testing behavior. |
| `codex/skills/` | Custom global Codex skills that are not duplicated in a Respan repository. |
| `workspace/work/AGENTS.md` | Instructions applied at the shared Respan work root. |
| `workspace/work/.cursor/skills/` | Workspace-local Cursor skill variants. |
| `workspace/work/scripts/` | Cross-repository helper scripts. |
| `workspace/work/e2e/` | Standalone Playwright configuration and user-flow tests. |

See [SETUP.md](SETUP.md) for the source-to-destination map and restore steps.

## Skills

| Skill | Location | What it does |
| --- | --- | --- |
| `change-logs-update` | `codex/skills/change-logs-update` | Builds shipped and work-in-progress changelog updates for the authenticated engineer across the Respan frontend and backend repositories. |
| `chronicle` | `codex/skills/chronicle` | Uses the local Chronicle screen-history feature when recent on-screen context is needed and its privacy preconditions are satisfied. |
| `e2e-testing` | `codex/skills/e2e-testing` | Creates and maintains user-flow-oriented Playwright tests in the shared E2E harness. |
| `investigate-review-comments` | `codex/skills/investigate-review-comments` | Triages GitHub review threads, verifies claims with concrete code and browser evidence, fixes confirmed issues, and prepares requested replies. |
| `respan-browser-testing` | `codex/skills/respan-browser-testing` | Validates frontend behavior in an authenticated browser against staging, records evidence, and keeps matching PR test notes current. |
| `e2e-testing` (workspace variant) | `workspace/work/.cursor/skills/e2e-testing` | Preserves the distinct Cursor-oriented version that lived under the shared work directory. |

The global and workspace E2E skills are both retained because their contents
differ. The global version is the current Codex installation; the workspace
copy preserves the local Cursor workflow.

## Scripts and tests

- `send-respan-otel-traces.mjs` generates deterministic synthetic OpenTelemetry
  traces for exercising Respan logs pages.
- The E2E harness contains authentication setup plus smoke, dashboard autosave,
  Experiment V2 rerun, and public-demo user journeys.
- The browser-testing skill includes staging trace seeding and a helper for
  updating a pull request's Test or Testing section.

## Deliberate exclusions

- `commit-and-push`, `create-pr`, and `convention` were not copied from the
  global Codex directory because byte-for-byte identical versions are already
  tracked by `respan-frontend` under `.cursor/skills/`.
- `respan-frontend-codex` contributed no local-only files. Its `AGENTS.md`,
  `CLAUDE.md`, `.claude/`, and `.cursor/` agent files were already tracked, and
  the checkout was clean when this snapshot was made.
- Respan repositories, worktrees, nested `.git` directories, dependencies,
  build output, Playwright reports, test results, screen recordings, sample
  datasets, and unrelated media are excluded.
- `.env`, authenticated browser state, API keys, tokens, and plaintext
  passwords are excluded. A few copied instructions contained a staging
  password; only the backup copies were sanitized before publication.

This repository is public. Keep credentials in local ignored files and review
future additions before committing them.
