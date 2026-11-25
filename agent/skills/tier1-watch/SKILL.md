---
description: Check whether tier-1 models have evals left to run after an eval change, and keep one issue on nuxt/nuxt-evals that says so and asks for a sweep.
---

# Watch tier 1

Work in `/workspace`, on `main`.

1. `pnpm run sweep plan`. It prints the tier-1 experiments with evals left, the same count a sweep would bill.
2. Find the open issue you keep for this: `gh issue list --repo nuxt/nuxt-evals --state open --search "Tier 1 has evals to run in:title" --json number,title,body`.
3. Nothing to run and no issue: stop.
4. Nothing to run but the issue is open: edit its body to one line saying every tier-1 model is complete, so the maintainer can close it. Stop.
5. Evals to run: open the issue, or edit it, titled `Tier 1 has evals to run`. Body:
   - One sentence on what changed, from `git log --since="7 days ago" --format="%h %s" -- evals/`.
   - The table `sweep plan` printed, as is.
   - `Comment \`@nuxt-evals sweep\` to run them.`

Never run the evals yourself, and don't comment on the issue. Editing the body is how it stays current.
