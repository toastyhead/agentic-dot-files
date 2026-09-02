---
name: change-logs-update
description: >-
  Prepare local change_logs updates for the authenticated respan-frontend
  engineer. Use when the user asks for changelog bullets, shipped changes on
  develop, or WIP updates covering their own PR progress.
---

# Change logs update

Use this skill to produce the user's `change_logs` update for
`respanai/respan-frontend`, following the SOP in
`respanai/respan-sop/engineering_guidelines/change_logs.md`.

## Scope

- Repository: `respanai/respan-frontend`
- Base branch: `develop`
- Author: only the authenticated local GitHub user from `gh api user --jq .login`.
- Shipped changes: that user's PRs merged into `develop` during the reporting window.
- WIP changes: that user's open PRs targeting `develop`, including progress, work done, blockers, and next steps when available.
- Reporting window: from the latest local `.change_logs/` update timestamp to now. If no previous update exists, use the current week and state that assumption.

## Local Markdown archive

Always write updates under `.change_logs/` in the repository root and return the full update in chat.

- Create the directory if it does not exist.
- Use one Markdown file per update: `.change_logs/YYYY-MM-DD-HHmm-change-logs.md`.
- Include the reporting window, shipped bullets, WIP bullets, and source PR links.
- Use the latest previous `.change_logs/*-change-logs.md` file to infer the previous window end when possible.
- Do not duplicate shipped PRs already covered by previous local updates.
- For WIP PRs, include progress since the previous update and the current state.

## Gather context

Use the local `gh` login and GitHub API directly through `gh api`; do not depend on browser sessions.

Resolve the author:

```bash
AUTHOR_LOGIN="$(gh api user --jq .login)"
```

List shipped PRs with GraphQL search:

```bash
gh api graphql \
  -F queryString="repo:respanai/respan-frontend is:pr is:merged base:develop author:${AUTHOR_LOGIN} merged:>=WINDOW_START" \
  -f query='
    query($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        nodes {
          ... on PullRequest {
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
```

List WIP PRs with GraphQL search:

```bash
gh api graphql \
  -F queryString="repo:respanai/respan-frontend is:pr is:open base:develop author:${AUTHOR_LOGIN}" \
  -f query='
    query($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        nodes {
          ... on PullRequest {
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
```

For each PR where the title/body is not enough, inspect details with `gh api graphql` and include recent commits, comments, and reviews. Keep the query scoped to `respanai/respan-frontend` and the PR number.

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

1. <Area>: Released. <Clear description of the change and impact.> <PR link>

### WIP

1. <Area>: In progress. <Progress or work completed so far.> <Current state, blocker, or next step when known.> <PR link>
```

Use short bullets. Each bullet should include:

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
- Include PR links for traceability.
- Keep wording readable for someone outside the engineering team.
- Prefer sentence case for section titles and bullet text.
