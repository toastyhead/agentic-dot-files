# Agent instructions

1. Never checkout new branches until the users asks you to do so.
2. When planning work, use only the `respan-frontend` and `respan-backend` repositories as the source of context and guidance.
3. For feature changes, bug fixes, regression investigations, review fixes, and PR validation in `respan-frontend`, automatically invoke the global `$respan-browser-testing` skill after implementation. Exercise every changed user flow on the live local app against the staging API and keep the associated PR's Test or Testing section current with the verified results.
4. Reuse `http://localhost:3000` for `/Users/rizwan_respan/work/respan-frontend`. Reuse `http://localhost:3001` for `/Users/rizwan_respan/respan-frontend-codex`. For git worktrees, use an isolated temporary server on another port as directed by the skill.
