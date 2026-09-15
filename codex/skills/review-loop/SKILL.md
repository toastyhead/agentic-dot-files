---
name: review-loop
description: >-
  Run a Respan GitHub PR through repeated Codex and Greptile reviews: request
  reviews, investigate findings with browser evidence, fix confirmed issues,
  commit and push, reply, resolve addressed threads, and repeat until both
  reviewers are satisfied with the final commit. Use when the user invokes
  review-loop, requests an end-to-end review loop after finishing a feature,
  or asks to keep fixing until Codex and Greptile are happy. A single-review
  request or feature implementation alone does not start this loop.
---

# Review loop

Carry an existing feature PR through review, investigation, verified fixes,
publication, replies, and fresh reviews. Default to **both Codex and Greptile**;
honor an explicit reviewer subset. Reuse the current task and branch.

## Scope and authorization

- Scope: `respanai/respan-frontend` and `respanai/respan-backend`, including
  fork branches and worktrees.
- Invoking this skill to run the loop authorizes review requests, scoped fixes,
  commits, pushes, PR Testing updates, replies, and resolution of addressed
  comments on the selected PR. Carry that authorization through every round;
  do not ask again. Honor any narrower user write boundary.
- Creating/editing this skill does not start a review run. Discovering it or
  completing a feature alone does not authorize GitHub writes.
- Do not create/check out branches, merge the PR, rewrite pushed history,
  change reviewer settings, or schedule background monitoring. Use an existing
  matching checkout; if unavailable, finish read-only discovery and report the
  missing prerequisite.
- Follow local `AGENTS.md`. This workflow does **not** authorize creating or
  materially expanding frontend automated tests. A reviewer's test request is
  not user approval. Run existing checks and validate in the browser.

## Compose these skills

Read each skill when entering its step; preserve its detailed SOP:

1. [investigate-review-comments](../investigate-review-comments/SKILL.md):
   fetch, investigate, classify, fix, verify, and reply.
2. [commit-and-push](../commit-and-push/SKILL.md): scoped staging,
   Conventional Commits, hooks, push, and verification.
3. [respan-browser-testing](../respan-browser-testing/SKILL.md): frontend
   staging validation, checkout/server provenance, cleanup, and PR Testing.

This loop supplies their end-to-end write authorization. Publish verified fixes
**before** a fixed reply or resolution. Do not spawn additional verification
agents unless the user explicitly requests delegation.

Read [GitHub review cycle](references/github-review-cycle.md) for collection,
triggers, freshness, and resolution mechanics.

## 1. Establish the starting state

1. Resolve the supplied PR or the current branch's PR with an explicit upstream
   repository. Record checkout, branch, base, head repository/branch, PR URL,
   and `headRefOid`. Confirm the PR is open and required tools/access exist.
2. Inspect status, staged/unstaged diffs, recent history, and push destination.
   Preserve unrelated user changes. If the finished feature has clearly scoped
   pending changes for this PR, verify and publish them with `$commit-and-push`
   before requesting reviews. Never sweep unrelated changes into a commit.
3. Prove local `HEAD` = fetched remote PR branch SHA = PR `headRefOid`.
   Stale tracking refs are insufficient. If another actor changes the head,
   re-read the diff and reconcile the target before continuing affected steps.
4. If no PR exists, finish local discovery and report that a PR is required;
   do not create one or guess the target.
5. Fetch reviews, summaries, checks, and fully paginated review threads. Keep
   a compact task ledger: round, SHA, reviewer/run/trigger IDs, finding IDs,
   evidence, fix SHA, reply URL, and verified resolution. After interruption,
   re-fetch live state and resume without repeating completed writes.

## 2. Request and wait for reviews

1. Inspect both reviewers' latest runs for this head. Reuse a complete current
   review or await an active one. Do not duplicate a queued/running review or
   a trigger awaiting acknowledgment.
2. Request each missing reviewer using the reference's documented trigger.
   Record the comment ID, timestamp, and requested SHA; request the full PR diff.
3. Poll in intervals of at most 60 seconds and keep the user informed. Allow
   up to 15 minutes per reviewer per round by default, honoring a user timeout.
   Diagnose missing runs, permissions, quotas, draft restrictions, skipped files,
   or service errors instead of repeatedly posting triggers.
4. Read the actual completed review. A green check, accepted trigger, acknowledgment,
   or lack of inline comments alone does not establish a clean review.
5. Fetch threads and current summaries again. Carry forward unresolved findings
   from any author, summary-only findings, and new substantive follow-ups. An
   outdated or automatically resolved thread can still contain an unaddressed claim.

## 3. Investigate and verify

1. Apply `$investigate-review-comments` to every outstanding claim, including
   summary findings. Combine source/context evidence with its mandatory browser
   check **before** a real-issue or false-alert verdict.
2. Fix only confirmed real issues, tracing changes to findings. Avoid unrelated
   refactors or changing correct behavior solely to improve a score.
3. Keep unavailable or contradictory browser verification **Inconclusive**.
   Continue independent, provable items; explain missing prerequisites and leave
   inconclusive claims unresolved.
4. Run focused existing checks and `git diff --check`; re-test each fixed behavior
   in the browser. For frontend work, apply `$respan-browser-testing` to changed
   paths and affected adjacent behavior against staging. Prove the listener's
   checkout, reuse staging data, and follow the skill's temporary-key/cleanup rules.
5. Keep browser evidence outside git and credentials out of artifacts/replies.
   Distinguish controlled browser responses from live backend evidence.

## 4. Publish, reply, and resolve

1. Use `$commit-and-push` for verified fixes, staging relevant files/hunks and
   retaining hooks. Skip empty commits when no code change is warranted. If
   hooks or concurrent edits change tested source, verify the resulting source.
2. Fetch again and prove local, remote, and PR head SHA parity. Attribute browser
   evidence to this commit only if its source matches the tested tree. Update
   PR Testing through the browser-testing skill and read back the saved block.
3. Re-fetch each thread before writing. Address every substantive claim, usually
   in one concise reply to the thread root:
   - **Real issue:** root cause, published fix SHA, browser/check evidence.
   - **False alert:** source explanation, checked SHA, browser evidence for no change.
   - **Inconclusive:** checks completed, missing prerequisite, reason it stays open.
   Reply to each summary-only finding with a linked top-level comment; it has
   no thread-resolution API.
4. Read back the reply, then resolve the exact addressed thread ID. All its
   claims must have verified fixes or evidence-backed no-change explanations.
   Do not resolve local-only fixes, inconclusive claims, or outdated threads
   without investigation. If auto-resolved, still verify and reply to unaddressed
   claims; do not treat the bot's resolution as proof.
5. Re-fetch GraphQL `reviewThreads` to verify replies and `isResolved`. After an
   ambiguous write failure, read live state before retrying. Never claim a failed
   push, reply, Testing update, or resolution succeeded.

## 5. Repeat until satisfied

After every push, both reviewers need completed reviews of the new head. Return
to step 2, reusing automatic runs already reviewing it. Previous-commit reviews
no longer qualify. If only false alerts/explanations were addressed, obtain one
fresh review or explicit reviewer reassessment; human resolution is not proof
of reviewer agreement. Read edited summaries even when no new threads appear.

Declare **Complete** only after a final live refresh confirms:

- Local, remote, and PR head still match; all intended fixes are published.
- Each selected reviewer completed the final-head review with no remaining
  actionable findings or pending follow-ups. Codex has an explicit clean result
  or its documented clean reaction attributable to this review request.
- Greptile reports **5/5** when scoring is enabled. If scoring is demonstrably
  disabled, require an explicit completed clean review and report `score disabled`.
  A missing or unattributed score is not a pass.
- Zero unresolved threads, unaddressed summary findings, or substantive new
  comments remain. Each investigated finding has a reply or a verified prior
  reply that still covers it.
- Required checks and relevant local/browser validation passed on the final
  source; applicable PR Testing updates and test-resource cleanup are verified.

Continue while rounds yield useful fixes or new evidence. Stop as **Blocked** or
**Incomplete** if access/prerequisites prevent progress, a reviewer times out or
skips the review, the user stops the run, or two successive completed rounds
repeat the same findings/score without a viable change or new evidence. Honor
user round/time limits. Complete independent work before reporting a blocker;
do not manufacture changes or lower review settings to force completion.

## Final report

Report PR link, branch, final SHA, outcome, and round count; Codex result and
Greptile score/result with review links and SHAs; fixes, replies, resolutions,
and remaining findings; browser/existing checks, PR Testing, cleanup, and blockers.
Never describe a stale, missing, skipped, or partial review as reviewer approval.
