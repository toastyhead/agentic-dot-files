---
name: change-logs-update
description: >-
  Prepare local change_logs updates for the authenticated Respan engineer across
  respan-frontend and respan-backend. Use when the user asks for changelog
  bullets, shipped changes on develop, or WIP updates covering their own PR
  progress.
---

# Change logs update

Use this skill to produce the user's `change_logs` update for
`respanai/respan-frontend` and `respanai/respan-backend`, following the SOP in
`respanai/respan-sop/engineering_guidelines/change_logs.md`.

## Scope

- Repositories:
  - `respanai/respan-frontend` at `/Users/rizwan_respan/work/respan-frontend`
  - `respanai/respan-backend` at `/Users/rizwan_respan/work/respan-backend`
- Base branch: `develop`
- Author: only the authenticated local GitHub user from `gh api user --jq .login`.
- Shipped changes: that user's PRs merged into `develop` in either repository during the reporting window.
- WIP changes: that user's open PRs targeting `develop` in either repository, including progress, work done, blockers, and next steps when available.
- Reporting window: from the latest local `.change_logs/` update timestamp to now. If no previous update exists, use the current week and state that assumption.

## Local Markdown archive

Always write one combined update under `/Users/rizwan_respan/work/respan-frontend/.change_logs/` and return the full update in chat.

- Create the directory if it does not exist.
- Use one Markdown file per update: `.change_logs/YYYY-MM-DD-HHmm-change-logs.md`.
- Include the reporting window, shipped bullets, WIP bullets, source repositories, and source PR links.
- Use the latest previous `.change_logs/*-change-logs.md` file to infer the previous window end when possible.
- Do not duplicate shipped PRs from either repository that are already covered by previous local updates.
- For WIP PRs, include progress since the previous update and the current state.

## Gather context

Use the local `gh` login and GitHub API directly through `gh api`; do not depend on browser sessions.

Resolve the author:

```bash
AUTHOR_LOGIN="$(gh api user --jq .login)"
WINDOW_START="YYYY-MM-DD"
```

Search both repositories:

```bash
REPOSITORIES=(
  "respanai/respan-frontend"
  "respanai/respan-backend"
)
```

List shipped PRs for each repository with GraphQL search:

```bash
for REPO in "${REPOSITORIES[@]}"; do
gh api graphql \
  -F queryString="repo:${REPO} is:pr is:merged base:develop author:${AUTHOR_LOGIN} merged:>=${WINDOW_START}" \
  -f query='
    query($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        nodes {
          ... on PullRequest {
            repository { nameWithOwner }
            number
            title
            body
            url
            mergedAt
            headRefName
            baseRefName
            author { login }
            labels(first: 20) { nodes { name } }
          }
        }
      }
    }'
done
```

List WIP PRs for each repository with GraphQL search:

```bash
for REPO in "${REPOSITORIES[@]}"; do
gh api graphql \
  -F queryString="repo:${REPO} is:pr is:open base:develop author:${AUTHOR_LOGIN}" \
  -f query='
    query($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        nodes {
          ... on PullRequest {
            repository { nameWithOwner }
            number
            title
            body
            url
            updatedAt
            isDraft
            headRefName
            baseRefName
            reviewDecision
            author { login }
            labels(first: 20) { nodes { name } }
          }
        }
      }
    }'
done
```

For each PR where the title/body is not enough, inspect details with `gh api graphql` and include recent commits, comments, and reviews. Keep the query scoped to that PR's repository and number.

If PRs reference Linear issue IDs and Linear tools are available, use them to clarify progress or product area. Follow MCP schema-reading requirements before calling any MCP tool.

## Classify status

- `Released`: merged into `develop` during the reporting window.
- `Pending deployment`: merged but evidence indicates it has not shipped to the target environment yet.
- `In progress`: the user's open PRs, draft PRs, active branches, or reviewed work not yet merged.

Do not invent product impact, release status, blockers, or next steps. If evidence is missing, keep the bullet factual and concise.

## Format

Follow the SOP format:

```markdown
## change_logs update

Window: YYYY-MM-DD to YYYY-MM-DD
Author: <github-login>

### Shipped to develop

1. Frontend / <Area>: Released. <Clear description of the change and impact.> <PR link>

### WIP

1. Backend / <Area>: In progress. <Progress or work completed so far.> <Current state, blocker, or next step when known.> <PR link>
```

Use short bullets. Each bullet should include:

- Source repository or product surface, such as `Frontend` or `Backend`.
- Product area or system area.
- Release status.
- What changed.
- Why it matters, when clear from the PR.

## Posting workflow

1. Draft the update first.
2. Write the Markdown update to `.change_logs/`.
3. Return the full update in chat.
4. After writing, report the local file path and include a short summary of what was saved.

## Quality checks

Before sending:

- Confirm every shipped item is authored by the local `gh` user and merged into `develop`.
- Confirm every WIP item is authored by the local `gh` user, still open, and targets `develop`.
- Confirm both `respanai/respan-frontend` and `respanai/respan-backend` were searched; if one cannot be searched, state that clearly.
- Include PR links for traceability.
- Keep wording readable for someone outside the engineering team.
- Prefer sentence case for section titles and bullet text.
