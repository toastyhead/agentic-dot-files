---
name: create-pr
description: Create a GitHub pull request from the current Codex Cloud checkout using the Respan PR SOP. Use when the user asks to open a pull request or submit the current changes for review.
---

# Create a pull request

Create a PR from the checkout and branch already prepared for the cloud task.
Never create or check out a branch unless the user explicitly asks.

## Resolve repositories and authentication

1. Require authenticated `gh` access with `gh auth status`. If it is
   unavailable, report the blocker; do not start interactive authentication or
   expose credentials.
2. Read `git remote -v`, the repository basename, current branch or detached
   state, and any existing PR metadata.
3. Resolve the canonical PR target:
   - `respan-frontend` -> `respanai/respan-frontend`
   - `respan-backend` -> `respanai/respan-backend`
   - another repository -> prefer its GitHub `upstream` remote; otherwise use
     the canonical repository returned by `gh repo view`.
4. Never infer that `origin` is the PR target; it may be a personal fork.

If the checkout is detached and no existing remote branch can be identified,
stop and ask whether the user wants a branch created. A request to create a PR
does not supply a branch name.

## Gather the complete change

Run these read-only checks, in parallel where practical:

- `git status --short --branch`
- `git remote -v`
- `git log --oneline <base>..HEAD`
- `git diff <base>...HEAD`
- remote tracking and divergence checks for the intended head branch
- `gh pr list` or `gh pr view` against the canonical repository to avoid a
  duplicate PR

Use the repository's actual base branch; Respan feature work normally targets
`develop`. Analyze every commit and the complete diff, not only the latest
commit.

If relevant changes are uncommitted, use `$commit-and-push` only because the
user's PR request authorizes publishing the scoped PR changes. Preserve
unrelated files and verify the published SHA.

## Resolve and publish the head

For a fork, parse the fork owner from the push remote and use an explicit head:

```bash
gh pr create \
  --repo respanai/respan-frontend \
  --head <fork-owner>:<current-branch> \
  --base develop \
  --title "type(scope): description [DEV-ID]" \
  --body-file /temporary/path/pr-body.md
```

Omit `--head` only when the branch lives in the canonical repository and GitHub
can resolve it unambiguously. For backend work, replace the repository with
`respanai/respan-backend`.

Do not push a default branch, force-push, rewrite history, or switch branches as
part of PR creation.

## Title and body

Use a Conventional Commit title:

```text
type(scope): imperative description [DEV-ID]
```

Keep the description lowercase, without a trailing period. Include a real
Linear ID only when the change maps to one.

Create the body from the full branch diff:

```markdown
## Summary
- <high-level outcome>

## Changes
- `<path>` - <what changed and why>

## Testing
- <checks already completed and their results>
- <remaining manual verification, if any>

## Linear
Closes DEV-XXXX

## Screenshots / GIFs
<UI evidence when available>
```

Omit empty Linear and screenshot sections. Do not claim a test or browser check
passed unless it ran against the PR head. Preserve an existing managed browser
testing block when updating a PR body.

Use a temporary body file or a safely quoted HEREDOC. Remove the temporary file
after the command completes.

## Verify

After creation:

1. Read the PR back from the canonical repository.
2. Confirm the base branch, head owner/branch, title, URL, and `headRefOid`.
3. Confirm `headRefOid` equals local `HEAD` and the intended remote branch SHA.
4. Return the canonical PR URL.

Do not mark the PR ready, merge it, post comments, or resolve review threads
unless the user requests those additional GitHub writes.
