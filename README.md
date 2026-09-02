# Agentic dot files

Sanitized backup of Rizwan's local agent instructions, custom skills, workspace
scripts, and Playwright harness. Cursor is the recommended runtime. Codex is
kept as a maintained compatibility copy.

This repository is not a scheduled sync. Clone it outside the Respan work
directory and copy only the payload paths in [SETUP.md](SETUP.md).

## Contents

| Path | Purpose |
| --- | --- |
| `cursor/rules/` | Global Cursor rules, including Respan workflow for both frontend checkouts. |
| `cursor/skills/` | Cursor-native global skills. |
| `codex/AGENTS.md` | Global Codex rules, kept in sync with the current local Codex installation. |
| `codex/skills/` | Codex global skills, including Chronicle which is Codex-only. |
| `workspace/work/AGENTS.md` | Instructions applied at the shared Respan work root. |
| `workspace/work/.cursor/skills/` | Workspace-local Cursor E2E skill, kept in sync with the global Cursor version. |
| `workspace/work/scripts/` | Cross-repository helper scripts. |
| `workspace/work/e2e/` | Standalone Playwright configuration and user-flow tests. |

## Skills

| Skill | Cursor | Codex | What it does |
| --- | --- | --- | --- |
| `respan-browser-testing` | yes | yes | Validates frontend behavior in an authenticated browser against staging and keeps matching PR test notes current. |
| `investigate-review-comments` | yes | yes | Triages GitHub review threads, verifies claims with browser evidence, and prepares replies. |
| `e2e-testing` | yes | yes | Creates and maintains user-flow Playwright tests in the shared E2E harness. |
| `audit-frontend-tests` | yes | yes | Audits frontend tests for brittle, redundant, or low-value coverage without modifying them. |
| `change-logs-update` | yes | yes | Builds shipped and work-in-progress changelog updates for the authenticated engineer. |
| `commit-and-push` | yes | yes | Stages, commits, and pushes with Conventional Commits. |
| `create-pr` | yes | yes | Opens a GitHub pull request against upstream `respanai/respan-frontend`. |
| `convention` | yes | yes | Frontend development conventions. |
| `chronicle` | no | yes | Codex screen-history skill. Cursor has no equivalent Memories/Chronicle recorder contract, so this stays Codex-only. |

## Scripts and tests

- `send-respan-otel-traces.mjs` generates deterministic synthetic OpenTelemetry traces for exercising Respan logs pages.
- `check-respan-gateway-pii-redaction.mjs` verifies gateway PII redaction against staging.
- The E2E harness contains authentication setup plus smoke, dashboard autosave, Experiment V2 rerun, public-demo, and playground-handoffs user journeys.
- The browser-testing skill includes staging trace seeding and a helper for updating a pull request's Test or Testing section.

## Restore destinations

Cursor is the shared source for both:

1. `/Users/rizwan_respan/work`
2. `/Users/rizwan_respan/respan-frontend-codex`

Restore Cursor files into `$HOME/.cursor`. Restore Codex files into `$HOME/.codex` only if you still use Codex. Workspace files go to `/Users/rizwan_respan/work`.

Do not copy these files into tracked Respan repositories unless you explicitly want them committed there.

## Deliberate exclusions

- MCP configuration, hook state, automation credentials, `.env` files, authenticated browser state, API keys, tokens, and plaintext passwords are excluded.
- Nested `.git` directories, dependencies, build output, Playwright reports, test results, screen recordings, and unrelated media are excluded.
- Chronicle remains Codex-only and is not installed under `cursor/skills/`.
- Cursor hooks (`~/.cursor/hooks.json` and `respan_hook.py`) stay machine-local and are not backed up here.

This repository is public. Keep credentials in local ignored files and review future additions before committing them.
