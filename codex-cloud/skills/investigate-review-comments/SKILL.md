---
name: investigate-review-comments
description: >-
  Investigate GitHub pull request review comments for Respan frontend/backend
  PRs, including Bugbot, Cursor, CodeRabbit, and human reviewer comments. Use
  when the user asks Codex to investigate, triage, verify, or address PR review
  comments by fetching unresolved review threads, reading the referenced code,
  verifying every claim in a headless browser before assigning a real-issue or
  false-alert verdict, fixing confirmed issues, and drafting or posting replies.
---

# Investigate review comments

Go through unresolved review comments on the active or named PR, decide with
code and mandatory browser evidence whether each comment is a real issue or a
false alert, fix only confirmed real issues, verify the result, and draft or
post thread replies according to the user's requested write boundary.

Scope repos: `respanai/respan-frontend` and `respanai/respan-backend`.

Codex Cloud has no access to the user's desktop browser, local Chrome profile,
or Mac localhost processes. Use the current checkout, authenticated `gh`, an
isolated server, and headless Playwright. If any prerequisite is unavailable,
keep the affected verdict `Inconclusive`.

## Workflow

Track this checklist during the run:

```text
- [ ] 1. Resolve the PR and fetch unresolved threads
- [ ] 2. Investigate each comment with code evidence and a mandatory browser check before verdict
- [ ] 3. Fix confirmed real issues only
- [ ] 4. Verify the fix locally and, when explicitly authorized, with parallel agents
- [ ] 5. Draft or post replies for every investigated thread
- [ ] 6. Summarize verdicts
```

## Step 1 - Resolve the PR and fetch unresolved threads

Resolve the exact PR first. If the user provides a PR URL or number, use that.
If the request is about the current branch, run from inside the repo:

First require `gh auth status` to succeed. Do not start interactive
authentication or guess the GitHub identity in a cloud run.

```bash
gh pr view --json number,url,headRefName,baseRefName,title
```

If the checkout is a fork or the repo is ambiguous, pass the upstream repo:

```bash
gh pr view PR_NUMBER --repo respanai/respan-frontend --json number,url,headRefName,baseRefName,title
gh pr view PR_NUMBER --repo respanai/respan-backend --json number,url,headRefName,baseRefName,title
```

Fetch review threads with resolution state and reply IDs. Use
`respan-frontend` or `respan-backend` as appropriate:

```bash
gh api graphql -F owner=respanai -F repo=respan-frontend -F pr=PR_NUMBER -f query='
  query($owner:String!,$repo:String!,$pr:Int!){
    repository(owner:$owner,name:$repo){
      pullRequest(number:$pr){
        reviewThreads(first:100){
          nodes{
            id
            isResolved
            isOutdated
            path
            line
            comments(first:50){
              nodes{ databaseId author{login} body url diffHunk }
            }
          }
        }
      }
    }
  }'
```

Keep only `isResolved: false`. Read each unresolved comment body plus its
`path`, `line`, `diffHunk`, author, and URL. Do not dump the whole payload into
the chat.

Some bots also leave top-level PR comments. Check those separately when the user
mentions Bugbot, Cursor, CodeRabbit, or summary comments:

```bash
gh api repos/respanai/respan-frontend/issues/PR_NUMBER/comments
gh api repos/respanai/respan-backend/issues/PR_NUMBER/comments
```

## Step 2 - Investigate each comment

For each unresolved comment:

1. Read the claim and the referenced `path:line`.
2. Read the surrounding code, related callers, and tests until the behavior is
   clear.
3. Before assigning a verdict, use `$respan-browser-testing` to verify the exact
   claim through headless Chromium. This
   is required for every comment, including UI, interaction, API, and backend
   claims. Exercise the closest browser-observable flow, network request, or
   browser-accessible endpoint and record what happened.
4. Compare the browser observation with the code path and reported defect.
5. Only then assign a verdict from the combined evidence.

The browser check is a hard verdict gate. Code reading, tests, lint, and type
checks supplement browser evidence but never replace it. Never classify a
comment as a real issue or false alert from code evidence alone.

Verdicts:

- **Real issue:** the mandatory browser check reproduces or otherwise directly
  confirms the reported behavior, and the code evidence identifies the
  matching defect.
- **False alert:** the mandatory browser check does not reproduce the claim and
  the code evidence shows that the case is handled, misread, or inapplicable.
- **Inconclusive:** the browser check cannot be completed, cannot reach the
  affected behavior, or conflicts with the code evidence. Say what was checked
  and what is still missing instead of guessing.

## Cloud browser investigation

Use the browser before every real-issue or false-alert verdict. Do not treat a
browser check performed only after classification as satisfying this gate. If
the app, endpoint, credentials, data, or browser tooling needed for the check is
unavailable, keep the verdict **Inconclusive** and name the missing precondition.
Do not silently fall back to a code-only verdict.

Start an isolated frontend server from the current checkout on a free high port
with `VITE_FETCH_ENDPOINT=https://staging-api.respan.ai/` and
`VITE_WS_ENDPOINT=wss://staging-api.respan.ai/`. Prove the server PID and
working directory belong to the exact PR head. Never assume ports 3000 or 3001.

Load `E2E_EMAIL` and `E2E_PASSWORD` from cloud environment variables when
authentication is required. Never print, persist, screenshot, or commit them.
Use the Playwright installation prepared by the Codex Cloud setup. Do not try
to access the in-app Browser, Chrome, an existing browser profile, or local
desktop state.

Capture evidence as a concise observation, screenshot, test output, or exact
DOM/UI or network state. Keep browser work scoped to the claim being
investigated. For non-UI claims, use the browser-visible application behavior,
network panel, or a browser-accessible endpoint that exercises the affected
path.

## Step 3 - Fix confirmed real issues

Fix only comments with a real-issue verdict. Keep each change traceable to the
comment it addresses and follow the repo's local conventions.

Do not fix false alerts. Do not make adjacent refactors. Do not commit, push,
or publish unless the user explicitly asks for that git/GitHub write action.

If a fix is local-only, do not claim the PR is fixed on GitHub. Say the local
patch is prepared and needs to be committed/pushed before the PR thread can be
truthfully closed out.

## Step 4 - Verify

Run targeted local checks that match the changed surface: focused tests,
lint/typecheck for touched files, `git diff --check`, and a browser re-check of
the affected behavior for every fixed issue. A fix is not fully verified until
the browser evidence shows that the original claim no longer reproduces.

If the user explicitly asks for subagents, delegation, parallel agent work, or
approves agent verification, spawn two independent verification agents in
parallel:

- **Code review agent:** read-only review of the branch diff, focused on
  whether the fix actually addresses the review comments and whether it adds
  regressions.
- **Browser verification agent:** headless Playwright reproduction of the
  original issue against the isolated server and exact PR head, using the cloud
  staging credentials and steps from the thread.

If agent verification is not explicitly authorized or the tools are unavailable,
perform the verification in the main thread and state that no subagent pass was
run.

## Step 5 - Draft or post replies

Reply to GitHub only when the user explicitly asks to post replies, resolve
comments, or address comments end to end. Otherwise, draft the replies in the
final response.

For review-thread replies, post on the root comment's `databaseId`:

```bash
gh api --method POST \
  repos/respanai/respan-frontend/pulls/PR_NUMBER/comments/ROOT_COMMENT_DATABASE_ID/replies \
  -f body="$(cat <<'EOF'
<reply body>
EOF
)"
```

For backend PRs, use `repos/respanai/respan-backend/...`.

For top-level issue comments, post a normal issue comment:

```bash
gh api --method POST \
  repos/respanai/respan-frontend/issues/PR_NUMBER/comments \
  -f body="$(cat <<'EOF'
<reply body>
EOF
)"
```

Do not resolve threads unless the user explicitly asks.

### Reply templates

Real issue, after the fix is published to the PR branch:

```text
Confirmed - this reproduces. Fixed it.

- Root cause: <what was actually wrong>
- Fix: <what changed>
- Verified: <local checks and browser evidence>
```

Real issue, local fix only:

```text
Confirmed - this reproduces. I have a local fix prepared.

- Root cause: <what was actually wrong>
- Fix: <what changed locally>
- Verification: <local checks and browser evidence>
- Next step: commit and push the fix before marking this resolved on the PR.
```

False alert:

```text
Investigated this and it looks like a false alert.

- What the code actually does: <code evidence>
- Browser check: <mandatory observed behavior>

No change needed.
```

Inconclusive:

```text
I investigated this but could not prove the claim either way yet.

- Checked: <code/browser checks completed>
- Still missing: <specific missing data, environment, or reproduction step>
```

## Step 6 - Summarize

Return a compact table:

| Thread | Browser evidence | Verdict | Action | Reply |
| --- | --- | --- | --- | --- |
| `path:line` | <concise observation or blocker> | Real / false / inconclusive | Fixed / local patch / no change | Posted link or drafted |

Include the PR URL, branch, commit status, and checks run. Call out any threads
that were skipped, ambiguous, or not posted because of the write boundary.
