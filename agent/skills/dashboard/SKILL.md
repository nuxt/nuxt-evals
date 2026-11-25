---
description: Run what the maintainer checked on the Evals Dashboard issue, one box at a time, and keep the dashboard current.
---

# Run the Evals Dashboard

The maintainer's check is the approval. Only act on the box ids named in this turn's request. Requests from earlier turns in this thread were already handled, so never run them again, and never act on boxes you find checked yourself.

## 1. Start

Call `dashboard` with `running` set to one line naming what you are about to do and the time in UTC as `HH:MM UTC`, like `Sweep of #71 started 11:00 UTC.` A line without that time is dropped at the next refresh. That rewrites the issue, which unchecks the boxes, so the maintainer sees the request was taken. During a sweep, the `sweep` tool rewrites that line itself every few minutes with its progress.

## 2. Run each box, in order

| Box | Do |
|---|---|
| `sweep-tier1` | Call `sweep` with `{}`, then follow steps 2 and 3 of the sweep skill. |
| `sweep-pr-<n>` | Call `sweep` with `{ pullRequest: <n> }`, then follow steps 2 and 3 of the sweep skill. |
| `smoke-tier1` | Call `sweep` with `{ smoke: true }`. Nothing to push. |
| `run-model-watch` | Load the add-model skill and run it. |
| `run-publish-results` | Load the publish-results skill and run it. |

Several boxes run one after another, never at the same time. Between two of them, call `dashboard` again with the next `running` line.

## 3. Finish

Call `dashboard` with `running: null`. The board now shows what is left.

Then reply once, here on the dashboard: one line per box with what happened, the sweep's `board` in a code block, and every entry of `incomplete` with the evals it is missing. When something threw, say what it said. Checking the box again retries it: a sweep commits what an earlier call paid for without running it twice.
