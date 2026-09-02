---
name: create-pr
description: >-
  Create a GitHub pull request following the respan PR SOP. Use when the user
  asks to create a PR, open a pull request, or submit changes for review.
---

# Create a pull request

## Upstream repository (required)

Always open PRs against the **organization repo**, not a personal fork:

- **Upstream:** `https://github.com/respanai/respan-frontend`
- Pass **`--repo respanai/respan-frontend`** on every `gh pr` command (`create`, `view`, `edit`, `merge`, etc.) so the PR is created and managed on upstream.

If your `origin` remote is a fork, push your branch to the fork first (`git push -u origin HEAD`), then create the PR on upstream with an explicit head (see below).

### Fork workflow: set `--head`

After `git remote -v`, if `origin` is **not** `respanai/respan-frontend`, parse the GitHub owner from `origin` (e.g. `git@github.com:rizwan-respan/respan-frontend.git` -> `rizwan-respan`) and pass:

`--head <fork-owner>:<current-branch>`

Example:

```bash
gh pr create --repo respanai/respan-frontend --head rizwan-respan:feature/my-branch --base develop \
  --title "feat(scope): description" --body "$(cat <<'EOF'
...
EOF
)"
```

If `origin` already points at `respanai/respan-frontend`, omit `--head` (default head is the current branch on the default push remote).

## Workflow

1. **Gather context** - run these in parallel:
   - `git status` - check for uncommitted changes.
   - `git remote -v` - confirm fork vs upstream; decide whether `--head owner:branch` is needed.
   - `git diff` - see staged and unstaged changes.
   - `git log --oneline <base>..HEAD` - all commits on this branch since it diverged (use the real base branch, e.g. `develop` or `main`).
   - `git diff <base>...HEAD` - full diff against the base branch.
   - Check if the branch tracks a remote and is up to date.

2. **Commit any remaining changes** following the commit-and-push skill / commit SOP.

3. **Push the branch** if needed (typically to `origin`, your fork):

```bash
git push -u origin HEAD
```

4. **Draft the PR** - analyze ALL commits on the branch (not just the latest) and write the title + body.

5. **Create the PR** using `gh pr create --repo respanai/respan-frontend` with a HEREDOC body. Add `--base <branch>` when the target is not the repo default (often `develop`). Add `--head fork-owner:branch` when working from a fork (see above).

```bash
gh pr create --repo respanai/respan-frontend --base develop --head FORK_OWNER:CURRENT_BRANCH \
  --title "type(scope): description [DEV-ID]" --body "$(cat <<'EOF'
## Summary
- Bullet 1
- Bullet 2

## Changes
- `path/to/file.tsx` - what changed and why
- `path/to/other.ts` - what changed and why

## Test plan
- [ ] Step-by-step verification instructions

## Linear
Closes DEV-1234
EOF
)"
```

(Omit `--head FORK_OWNER:CURRENT_BRANCH` when `origin` is `respanai/respan-frontend`.)

6. **Return the PR URL** to the user (it will be under `github.com/respanai/respan-frontend/pull/...`).

## PR title format

The PR title follows the same Conventional Commits format as commit messages:

```text
type(scope): description [DEV-ID]
```

- Use the same type table as commits (`feat`, `fix`, `refactor`, etc.).
- Keep it imperative, lowercase, no period, <=50 characters for the description.
- Append the Linear issue ID when applicable.

## PR body template

```markdown
## Summary
<1-3 bullet points summarizing the change at a high level>

## Changes
<List key files changed with a short "what and why" for each>

## Test plan
<Checklist of steps to verify the PR works correctly>

## Linear
<"Closes DEV-XXXX" or "Part of DEV-XXXX" - omit section if no ticket>

## Screenshots / GIFs
<Include for any UI changes - omit section if backend-only>
```

## Stacked PRs

For large features, break into 3-5 sequential PRs:

1. Each PR should be independently reviewable.
2. Order: foundations first (schema -> API -> frontend -> cleanup).
3. Name branches with a common prefix: `feature/part-1-schema`, `feature/part-2-api`, etc.
4. Each PR targets the appropriate upstream base branch (often `develop` or `main`); use `gh pr create --repo respanai/respan-frontend --base <branch>`.

### When an upstream branch is updated

```bash
git checkout feature/part-2-api
git rebase feature/part-1-schema
git push origin feature/part-2-api --force-with-lease
```

### After an upstream PR merges

```bash
git checkout main && git pull origin main
git checkout feature/part-2-api
git rebase main
git push origin feature/part-2-api --force-with-lease
# Update the PR base to main on GitHub
```

## Safety rules

- NEVER update git config.
- NEVER use `--force`; always use `--force-with-lease` when rebasing stacked branches.
- NEVER force-push to `main` or `master`.
- NEVER push code that likely contains secrets.
- Always use `--repo respanai/respan-frontend` for `gh pr` (and related `gh` PR commands) so PRs are never opened on a fork by mistake.
- Always return the PR URL when done so the user can review it.
