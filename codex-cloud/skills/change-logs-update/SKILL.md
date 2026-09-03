---
name: change-logs-update
description: Prepare concise Respan change-log updates from authenticated GitHub data for the requested frontend and/or backend scope. Use when the user asks for changelog bullets, changes shipped to develop, or progress on their open pull requests from a Codex Cloud run.
---

# Change logs update

Produce a factual update for the requested scope in `respanai/respan-frontend`
and/or `respanai/respan-backend`. Query GitHub directly; do not assume both
repositories are checked out in the cloud container.

## Preconditions and scope

1. Resolve the current checkout with `git rev-parse --show-toplevel` and its
   GitHub repository from remotes.
2. Honor the repository scope in the user's request. If none is stated, cover
   both frontend and backend.
3. Require working authenticated `gh` access. Resolve the author with
   `gh api user --jq .login`. If authentication is unavailable, report the
   blocker; do not guess an identity or start interactive authentication.
4. Use `develop` as the base branch.
5. Use the latest `.change_logs/*-change-logs.md` in a checked-out
   `respan-frontend` repository as the reporting-window boundary. If no archive
   exists, use the current week and state that assumption in the saved file.

Shipped changes are the authenticated user's pull requests merged into
`develop` during the reporting window. Work in progress is the user's open pull
requests targeting `develop`. Do not invent release state, impact, blockers, or
next steps.

## Query GitHub

Build the repository list from the requested scope:

```bash
repositories=(
  "respanai/respan-frontend"
  "respanai/respan-backend"
)
```

For each selected repository, query merged and open pull requests:

```bash
author_login="$(gh api user --jq .login)"
window_start="YYYY-MM-DD"

for repository in "${repositories[@]}"; do
  gh api graphql \
    -F queryString="repo:${repository} is:pr is:merged base:develop author:${author_login} merged:>=${window_start}" \
    -f query='query($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        nodes { ... on PullRequest {
          repository { nameWithOwner }
          number title body url mergedAt headRefName baseRefName
          author { login }
          labels(first: 20) { nodes { name } }
        } }
      }
    }'

  gh api graphql \
    -F queryString="repo:${repository} is:pr is:open base:develop author:${author_login}" \
    -f query='query($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        nodes { ... on PullRequest {
          repository { nameWithOwner }
          number title body url updatedAt isDraft headRefName baseRefName
          reviewDecision author { login }
          labels(first: 20) { nodes { name } }
        } }
      }
    }'
done
```

Inspect recent commits, comments, and reviews only when a PR's title and body do
not establish its current state. If a referenced Linear issue is unavailable,
use the GitHub evidence and do not delay the update.

## Build the update

Group closely related PRs into concise workstreams. Each line must be formal,
factual, understandable outside the implementation team, and no more than 35
words before its links.

Use these states:

- `Released`: merged into `develop` during the reporting window.
- `Pending deployment`: merged, with explicit evidence it has not reached the
  target environment.
- `In progress`: an open or draft PR targeting `develop`.

Do not duplicate a shipped PR already present in an earlier archive. An item
that was previously in progress may appear again as released.

## Save and return

The archive must be written from a `respan-frontend` checkout:

```bash
repo_root="$(git rev-parse --show-toplevel)"
archive_directory="$repo_root/.change_logs"
archive_path="$archive_directory/$(date +%Y-%m-%d-%H%M)-change-logs.md"
```

If the current cloud checkout is not `respan-frontend`, do not save into an
unrelated repository. Report that a frontend checkout is required for the
archive unless the user explicitly provides another destination.

Write the same compact update to the archive, read it back, and return exactly:

```text
Updates:
- Frontend / <workstream>: Released. <what changed and why it matters> <PR links>
- Backend / <workstream>: In progress. <current factual progress> <PR links>
Saved to: /absolute/path/to/.change_logs/YYYY-MM-DD-HHmm-change-logs.md
```

Return no introduction, metadata, extra sections, implementation minutiae,
inbox item, or closing summary after `Saved to:`.

## Verification

- Confirm every item is authored by the resolved GitHub user.
- Confirm merged items reached `develop` inside the reporting window.
- Confirm WIP items remain open and target `develop`.
- Confirm every requested repository was queried or state the query blocker.
- Confirm the archive exists and its contents match the returned update.
