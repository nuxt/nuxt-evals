---
description: Find a model the board is missing, check the gateway serves it, and open the pull request that registers it as an experiment.
---

# Register a new model

Work in `/workspace`, on `main`. One model, one pull request, one commit.

## 1. Find candidates

1. Call `gateway__catalog`. It returns recent language models with tool use.
2. List what is registered: `grep -h "model:" experiments/*.ts`. A catalog id is registered when it appears in one of those strings, with or without a harness prefix or a `?reasoningEffort=` suffix.
3. Apply "Which models belong on the board" from your instructions to the rest. Read `scripts/tier-one.ts` and the README's "Model retention policy" to see which product lines exist and which model each line currently carries.
4. Check that nobody proposed the model before, from any branch, so you never propose it twice: `gh pr list --repo nuxt/nuxt-evals --state all --search "<model name> in:title" --limit 200 --json number,title,state,headRefName`, once per candidate, with the name as it would appear in an experiment slug. A closed, unmerged one means a maintainer said no.

No candidate left is the normal outcome. Report and stop.

## 2. Probe

Call `gateway__probe` for each remaining candidate.

- `served: false` with status 403 and `RestrictedProvidersError`: the team allowlist blocks it. Skip it, name it in your report.
- Any other failure: skip it this run, name it and the error.
- `served: true`: keep the provider and cost fields for the pull request body.

Pick the single best candidate that is served. Leave the others for the next run.

## 3. Write the registration

Follow "Adding a new experiment (model)" in `AGENTS.md` exactly: the experiment file, `MODEL_NAMES`, `HARNESS_NAMES` when needed, `MODEL_PRICING`, the README row, and `TIER_ONE_EXPERIMENTS`.

Harness and model string, by the catalog id's provider:

| Provider | `agent` | `model` |
|---|---|---|
| `anthropic` | `vercel-ai-gateway/claude-code` | `anthropic/<model>` |
| `openai` | `vercel-ai-gateway/codex` | `openai/<model>?reasoningEffort=high` |
| anything else | `vercel-ai-gateway/opencode` | `vercel/<provider>/<model>` |

Copy the newest experiment of the same harness as the template and change only what differs. The file must stay a plain config literal: the import, the `config` object with literal fields and comments, the default export. The sweep refuses anything else.

- **Name**: the experiment slug follows its siblings, like `gpt-6.2-sol-high` or `kimi-k3.1-pro`.
- **Timeout**: `timeout` is part of the result fingerprint, so raising it later reruns everything. Look for the same model in `vercel/next-evals-oss` (`https://raw.githubusercontent.com/vercel/next-evals-oss/main/experiments/<name>.ts`, their slug may differ) and reuse its timeout with a comment naming the source. Otherwise use the timeout of the predecessor in the same line.
- **Price**: per 1M tokens, from the catalog. When the probe reports a billed cost that implies a different rate, or the catalog says the price varies by provider, keep the catalog number and say in the pull request that it is unverified against billing.
- **Tier**: add the model to `TIER_ONE_EXPERIMENTS`. When it supersedes a model of the same line, keep the predecessor and mark its line exactly as `'<old>', // Until <new> has a complete run.` The sweep removes that line once the new run is complete.

## 4. Check

```bash
pnpm run test:cost
npx agent-eval --dry <name>
```

Both must pass. `git status --short` must show only `experiments/<name>.ts`, `scripts/export-results.ts`, `scripts/cost.ts`, `scripts/tier-one.ts` and `README.md`.

## 5. Open the pull request

Commit locally on a branch named `agent/add-<name>` with the message `feat(experiments): add <name>`. Push it with the GitHub tool, with exactly this form, the only one it accepts:

```bash
git push --no-follow-tags origin HEAD:refs/heads/agent/add-<name>
```

Then open the pull request with `gh pr create --head agent/add-<name> --base main`, on `nuxt/nuxt-evals`, titled like the commit and not as a draft.

Body, in this order and nothing else:

- One sentence: the model, its vendor, its release date, and which model of the line it follows.
- The probe result: the provider that answered and the cost it reported.
- The price row you added and whether billing confirmed it.
- Where the timeout comes from.
- Anything you could not verify.
- The last line, from `pnpm run sweep plan <name> --registration`: `Comment \`@nuxt-evals sweep\` to run its <n> evals.`

The maintainer starts the sweep from that comment. Do not comment on the pull request or follow up.
