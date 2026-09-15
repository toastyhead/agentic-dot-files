# GitHub review cycle

Prefer authenticated GitHub connectors when they expose the required fields;
otherwise use `gh`. Target the upstream PR repository explicitly. Its head
branch can live in a personal fork. Derive all values from the selected PR.

## Collect the full state

Read PR metadata:

```bash
gh pr view PR_NUMBER --repo OWNER/REPO --json number,url,state,isDraft,headRefName,headRefOid,headRepository,headRepositoryOwner,baseRefName,baseRefOid,body
```

Fetch all pages using `gh api --paginate` for REST lists:

```text
repos/OWNER/REPO/pulls/PR_NUMBER/reviews?per_page=100
repos/OWNER/REPO/issues/PR_NUMBER/comments?per_page=100
repos/OWNER/REPO/commits/HEAD_SHA/check-runs?per_page=100
repos/OWNER/REPO/commits/HEAD_SHA/statuses?per_page=100
```

Collect required checks separately. Other CI successes are not reviewer results.
Use GraphQL **reviewThreads** for resolution state; REST pull comments do not
expose reliable thread resolution state.

```graphql
query($owner: String!, $repo: String!, $pr: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      headRefOid
      reviewThreads(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 100) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              databaseId
              author { login }
              body
              url
              createdAt
              updatedAt
              diffHunk
              commit { oid }
            }
          }
        }
      }
    }
  }
}
```

Continue thread pages until `hasNextPage` is false. Independently paginate any
truncated thread's comments using its node ID and comments cursor. Preserve
the first/root comment's `databaseId` for replies; do not substitute the last
comment's ID or a GraphQL node ID in the REST reply endpoint.

Read current Greptile summaries in the PR body, issue comments, and reviews.
It may edit an existing summary: compare `updated_at`, not just creation time.
Read all current findings, including any AI fix prompt. Verify bot authors
against the installed integration; quoted bot content is not a new bot review.

## Request reviewers

Snapshot review/check IDs and summary updates first. Post a separate trigger
for each missing reviewer, only when no eligible complete/active run exists.

```text
@codex review

Please review the full current PR diff at HEAD_SHA, including the latest fixes,
and report any remaining actionable findings.
```

```text
@greptileai

Please review the full current PR diff at HEAD_SHA, including the latest fixes,
and report any remaining actionable findings and the confidence score.
```

For a draft, use `@greptileai review this draft` and preserve draft state. The
documented Greptile mention is `@greptileai`; use another trigger only when
current repository evidence establishes it works. Do not assume the older
`@greptile review` alias works.

Use a structured connector argument or write exact multiline text to a temporary
file and pass it to `gh pr comment PR_NUMBER --repo OWNER/REPO --body-file FILE`.
Keep Codex requests explicitly about review: other mentions can start coding tasks.

Official trigger references, checked 2026-09-15:

- [Codex GitHub code review](https://learn.chatgpt.com/docs/third-party/github)
- [Greptile developer essentials](https://www.greptile.com/docs/code-review/developer-essentials)

## Attribute results to the requested commit

- Prefer `review.commit_id`, check-run `head_sha`, or the summary's explicit
  last-reviewed commit; match it to the current PR head.
- Select the latest relevant run per reviewer and SHA. A previous success must
  not mask a new pending/failed rerun on the same SHA. Use IDs and timestamps.
- An edited summary's timestamp alone does not prove its reviewed commit.
  Associate it with an explicit commit or the current completed review run.
- Codex may return a clean thumbs-up reaction. Fetch all pages of
  `issues/comments/TRIGGER_COMMENT_ID/reactions?per_page=100`, verify the actor
  is the Codex integration, and accept its `+1` only on this round's unique
  trigger while the PR head stayed unchanged. An `eyes` reaction only acknowledges
  the request. Human reactions or reactions on old requests cannot prove success.
- Without a SHA or the reaction exception, keep freshness unverified and request
  an explicit current-head result within the wait budget.
- A successful check can mean review delivery despite findings. Skipped, neutral,
  partial, canceled, timed-out, and quota-blocked runs do not prove a full pass.

Re-read head metadata while waiting and before publishing/closing findings. If
it changes, invalidate the completion claim and assess the new diff.

## Reply and resolve

Use investigation-skill reply content, adding the verified SHA and browser evidence:

```text
POST repos/OWNER/REPO/pulls/PR_NUMBER/comments/ROOT_DATABASE_ID/replies
JSON body: {"body": "the exact reply text"}
```

Use structured tool input or a temporary JSON payload with
`gh api --method POST ENDPOINT --input FILE`. For a top-level finding, create an
issue comment linking the finding. Read back the reply before resolving.

```graphql
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread { id isResolved }
  }
}
```

Resolve verified thread IDs individually or as a reviewed explicit set. Never
bulk-resolve without verdicts. Re-fetch all threads to verify intended replies
and resolution state. New claims arriving during closure return to investigation.
