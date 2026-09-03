# Respan staging browser test account

Use `E2E_EMAIL` and `E2E_PASSWORD` from the Codex Cloud environment only to
authenticate the isolated Respan frontend against `staging-api.respan.ai`.
There is no reusable desktop browser session in the cloud environment.

Never copy the credentials into commentary, final summaries, screenshots, pull
request descriptions, test artifacts, command output, or repository files.

If either variable is unavailable, mark authenticated checks `Blocked`; do not
start interactive credential setup or substitute another identity.
