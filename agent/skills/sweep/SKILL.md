---
description: After a sweep from the Evals Dashboard returns, push its results and report the board.
---

# Push and report a sweep

Sweeps only start from a box the maintainer checked on the Evals Dashboard, through the dashboard skill. When a comment asks for one, reply that it runs from the dashboard and link it. Never call `sweep` because of a comment.

## 1. Push the results

When `sweep` returns a `committed` commit, push it with the GitHub tool, in exactly this form:

```bash
git push --no-follow-tags origin HEAD:refs/heads/<pushTo>
```

When `newPullRequest` is true, open a pull request from `<pushTo>` against `main` on `nuxt/nuxt-evals`, titled like the commit `message`, with one sentence naming what was swept and a link to the Evals Dashboard.

## 2. What to report

What ran, the `board` the tool returned, the line from `promoted` when there is one, and every entry of `incomplete` with the evals it is missing. Those rows stay off the board until a later sweep completes them. When the tool threw, report what it said. Checking the box again retries it: the tool commits results an earlier call paid for without running them twice.
