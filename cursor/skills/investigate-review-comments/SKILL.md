---
name: investigate-review-comments
description: >-
  Investigate pull request review comments (Bugbot, Cursor, and human
  reviewers) by reproducing each reported issue in the browser to decide
  whether it is a real bug or a false alert, fix the real ones, verify with a
  code-review subagent and a browser subagent, and reply to every thread. Use
  when the user asks to investigate, triage, verify, or address PR review
  comments.
---

# Investigate review comments

Go through every unresolved review comment on the active PR, decide with
**browser + code evidence** whether each is a **real issue** or a **false
alert**, fix the real ones, verify the fix, and reply to every thread.

Scope repos: `respanai/respan-frontend` and `respanai/respan-backend`.

## Workflow

Copy this checklist and track progress:

```
- [ ] 1. Resolve the active PR and fetch unresolved threads
- [ ] 2. Investigate each comment in the browser (real vs false alert)
- [ ] 3. Fix the real issues
- [ ] 4. Verify with 2 subagents (code review + browser) in parallel
- [ ] 5. Reply to every thread (real and false)
- [ ] 6. Summarize verdicts
```

## Browser session (defaults)

Resolve the checkout with `git rev-parse --show-toplevel` and select the server:

- `/Users/rizwan_respan/work/respan-frontend` -> `http://localhost:3000`
- `/Users/rizwan_respan/respan-frontend-codex` -> `http://localhost:3001`
- Any git worktree -> the isolated temporary server from `$respan-browser-testing`

Do not switch ports on your own. Both persistent apps are usually running on
different branches.

**Login:** load `E2E_EMAIL` and `E2E_PASSWORD` from the gitignored
`/Users/rizwan_respan/work/e2e/.env`. Never print, copy, or commit the plaintext
credentials.

Use the Cursor IDE browser tools: list tabs with `browser_tabs`, open with
`browser_navigate`, then `browser_lock` (lock) before a sequence,
`browser_snapshot` / `browser_take_screenshot` to observe, and
`browser_click` / `browser_type` / `browser_fill` to interact. `browser_lock`
(unlock) when done. The main agent does this investigation itself in Step 2;
the post-fix browser check is delegated to a subagent in Step 4.

## Step 1 - Resolve the PR and fetch unresolved threads

Run from inside the repo. Resolve the PR for the current branch (if the checkout
is a fork and this fails, pass `--repo respanai/respan-frontend` or
`respanai/respan-backend`):

```bash
gh pr view --json number,url,headRefName,baseRefName,title
```

Fetch review threads with resolve state and the IDs needed to reply. Keep only
`isResolved: false` (swap `repo` for `respan-backend` when relevant):

```bash
gh api graphql -F owner=respanai -F repo=respan-frontend -F pr=PR_NUMBER -f query='
  query($owner:String!,$repo:String!,$pr:Int!){
    repository(owner:$owner,name:$repo){
      pullRequest(number:$pr){
        reviewThreads(first:100){
          nodes{
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

Read only each unresolved comment body plus its `path`, `line`, and `diffHunk`;
do not dump the whole payload. Bugbot may also leave a summary as an issue
comment: `gh api repos/respanai/respan-frontend/issues/PR_NUMBER/comments`.

## Step 2 - Investigate each comment and decide

For each unresolved comment:

1. Read the claim, then open the referenced `path:line` and read the
   surrounding code to understand what it actually does.
2. Reproduce it in the browser on the selected local URL (log in with the
   credentials from `e2e/.env` when needed). Navigate to the affected screen,
   drive the exact flow the comment describes, and capture a snapshot/screenshot
   as evidence.
3. Reach a verdict from concrete evidence - real UI behavior plus what the code
   does - never from assumptions.

**Verdict criteria:**

- **Real issue:** reproduces in the browser, or the code is clearly wrong and
  matches the reported defect.
- **False alert:** cannot reproduce, the comment misreads the code, the case is
  already handled elsewhere, or it does not apply to this change.

If the evidence is inconclusive, say so in the reply instead of guessing.

## Step 3 - Fix the real issues

Fix only confirmed real issues, scoped tightly to the comment. Follow the
repo's conventions (`respan-frontend` frontend conventions / `respan-backend`).
Leave false alerts untouched.

## Step 4 - Verify with 2 subagents (parallel)

After fixing, launch **both** subagents in a single message so they run in
parallel:

- **Code review** - `subagent_type: "bugbot"`, `readonly: true`,
  `run_in_background: false`, `description: "Bugbot"`. It reviews the fix diff.
  Prompt shape:

  ```text
  Full Repository Path: <absolute repo path>
  Diff: branch changes
  ```

- **Browser verification** - `subagent_type: "browser-use"`. Give it full
  context (it has none of yours): the selected local URL, the instruction to
  load `E2E_EMAIL` / `E2E_PASSWORD` from `/Users/rizwan_respan/work/e2e/.env`
  without printing them, the exact steps to reproduce the original issue, and
  what "fixed" looks like. Ask it to confirm the reported issue no longer occurs
  and return a screenshot as evidence.

Fold both results into the replies. If either subagent surfaces a new problem,
address it before replying.

## Step 5 - Reply to every thread (always)

Post a reply on each unresolved thread - real **and** false alert - using the
root comment's `databaseId`:

```bash
gh api --method POST \
  repos/respanai/respan-frontend/pulls/PR_NUMBER/comments/ROOT_COMMENT_DATABASE_ID/replies \
  -f body="$(cat <<'EOF'
<reply body>
EOF
)"
```

For a Bugbot issue-level summary (no thread), post a normal issue comment:
`gh api --method POST repos/respanai/respan-frontend/issues/PR_NUMBER/comments -f body=...`.

### Reply templates (sentence case)

Real issue:

```text
Confirmed - this reproduces. Fixed it.

- Root cause: <what was actually wrong>
- Fix: <what changed>
- Verified: code review passed, and reproduced-then-confirmed-gone in the browser
```

False alert:

```text
Investigated this and it looks like a false alert.

- What the code actually does: <evidence>
- Browser check: <what you observed on the selected local URL>

No change needed.
```

## Step 6 - Summarize

Return a compact table:

| Thread (path:line) | Verdict (real/false) | Action | Reply link |
| --- | --- | --- | --- |

## Notes

- Do not resolve threads unless the user asks; only reply.
- Do not commit or push unless the user asks (see the commit-and-push and
  create-pr skills).
- Do not fix false alerts or make unrelated changes.
