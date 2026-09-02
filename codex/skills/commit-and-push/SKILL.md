---
name: commit-and-push
description: >-
  Stage, commit, and push code changes following Conventional Commits and the
  respan commit SOP. Use when the user asks to commit, commit and push, or
  save their changes to git.
---

# Commit and push

## Workflow

1. **Inspect changes** - run `git status` and `git diff --staged` (and `git diff` for unstaged) in parallel to understand what will be committed.
2. **Review recent history** - run `git log --oneline -5` to match the project's commit style.
3. **Stage files** - add relevant files (`git add <paths>`). Never stage files that likely contain secrets (`.env`, `credentials.json`, etc.); warn the user if they ask to commit those.
4. **Draft the commit message** following the format below.
5. **Commit** using a HEREDOC so multi-line messages render correctly:

```bash
git commit -m "$(cat <<'EOF'
type(scope): subject line here [DEV-ID]

Optional body explaining what and why.
EOF
)"
```

6. **Push** - `git push` (or `git push -u origin HEAD` if no upstream is set). `origin` is often a personal fork; that is fine. When opening a PR afterward, use the create-pr skill: PRs must be created on upstream `respanai/respan-frontend` via `gh pr create --repo respanai/respan-frontend` (not on the fork).
7. **Verify** - run `git status` after push to confirm success.

## Commit message format

We follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

```text
<type>[optional scope]: <description> [optional DEV-ID]

[optional body]

[optional footer(s)]
```

### Rules

| Rule | Detail |
|------|--------|
| Subject mood | Imperative ("add feature", not "added feature") |
| Subject casing | Lowercase first letter of description |
| Subject punctuation | No period at the end |
| Subject length | 50 characters max |
| Body wrap | 72 characters per line |
| Body content | Explain **what** and **why**, not how |
| Body separator | Blank line between subject and body |

### Types

| Type | Purpose |
|------|---------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Neither fix nor feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration changes |
| `chore` | Other non-src/test changes |

### Breaking changes

Use `!` after the type/scope:

```text
feat(api)!: change response format

BREAKING CHANGE: response now returns array instead of object
```

### Linear integration

Append the Linear issue ID at the end of the subject:

```text
feat(mcp): implement tool-calling support [DEV-1234]
```

Use magic words in the body/footer to auto-close the issue:
`close`, `closes`, `closed`, `closing`, `fix`, `fixes`, `fixed`, `fixing`,
`resolve`, `resolves`, `resolved`, `resolving`, `complete`, `completes`,
`completed`, `completing`.

Use reference words to link without closing:
`ref`, `refs`, `references`, `part of`, `related to`, `contributes to`,
`toward`, `towards`.

Only add `[DEV-ID]` when the commit maps to a real Linear issue.

## Examples

```text
feat(mcp): implement tool-calling support [DEV-1234]

Integrating MCP to our platform. This replaces our custom tool-calling
logic and allows for easier expansion of agent capabilities.

- Add MCP support to the platform
- Update playground sidepanel to edit MCP tools
```

```text
chore: remove unused imports
```

```text
fix(parser): handle empty input gracefully
```

## Safety rules

- NEVER update git config.
- NEVER use `--force`; use `--force-with-lease` only when necessary.
- NEVER skip hooks (`--no-verify`) unless the user explicitly requests it.
- NEVER force-push to `main` or `master` without warning the user.
- NEVER amend a commit that has already been pushed unless the user explicitly asks.
