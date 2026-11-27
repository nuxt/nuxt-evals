# Nuxt Evals

Agent evaluations for Nuxt coding tasks, powered by [`@vercel/agent-eval`](https://www.npmjs.com/package/@vercel/agent-eval).

## Setup

```bash
pnpm install
vercel env pull   # writes VERCEL_OIDC_TOKEN to .env.local
```

The OIDC token is the only credential the gateway harnesses need, and it lasts about 12 hours, so pull it again before each sweep. `agent-eval` prefers `AI_GATEWAY_API_KEY` over it when that is set, which would bill runs to a personal key. `pnpm run eval:tier1` ignores a shell `AI_GATEWAY_API_KEY` when `.env.local` has the token, and refuses to start with an expired one. The Cursor harness also needs `CURSOR_API_KEY` in `.env.local`.

## Running evals

Results are memoized by fingerprint: an eval reruns for a model when the eval's files or the experiment config change, and never otherwise.

```bash
pnpm run eval:tier1:status              # what each tier-1 model is missing
pnpm run eval:tier1                     # run it, one model at a time
pnpm run eval:tier1 -- --parallel       # run every model with work left in one process
pnpm run eval:tier1 -- --smoke          # one eval per model, to check access
pnpm run eval <experiment...>           # run specific experiments
pnpm run eval:smoke <experiment...>     # one eval each, to check access
```

- Tier 2 is never rerun (see [Model retention policy](#model-retention-policy)), so stick to `eval:tier1` or name experiments explicitly. Avoid `agent-eval --force`, which reruns every model.
- A smoke run always exits 1 and deletes its result, even when the eval passes. Read its ✓ or ✗ line.
- Infra failures (rate limits, sandbox or provider timeouts, auth errors) are classified and deleted, not counted. Run the same command again to retry them. `eval:tier1` lists what is still missing at the end.
- `timeout` is part of the fingerprint, so raising it reruns every eval of that model. Pick a generous one before the first sweep.

## Exporting results

```bash
pnpm run export-results                     # every experiment with results
pnpm run export-results -- claude-opus-5.5  # specific experiments
```

This writes `agent-results.json`. A tier-1 model with an eval it hasn't run yet is skipped and named at the end, so a partial run never reaches the board. `--allow-partial` publishes it anyway, with the missing evals counted as not passed.

Each experiment also gets an `avgCostUsd`: the mean list cost per eval. Tokens are read from each run's `transcript-raw.jsonl` (handled per harness in `scripts/cost.ts`) and multiplied by the list prices in `MODEL_PRICING`. A model with no price entry, or whose runs carry no token usage, exports `null` and renders as N/A. Prices are a snapshot, so re-run the export to refresh them.

Transcripts are not committed, so the export saves each result's token counts next to its `summary.json` as `usage.json`, which is. A result with no transcript on disk, as in a fresh clone or in CI, is priced from that file. A result exported before `usage.json` existed keeps the cost already in `agent-results.json`.

`pnpm run test:cost` runs the unit tests for the token extraction and pricing.

## Automation

An agent in `agent/`, built with [eve](https://eve.dev) and deployed on Vercel, keeps the board current. It never merges anything.

| Schedule | What it does |
|----------|--------------|
| `dashboard`, daily | Keeps the **Evals Dashboard** issue current: tier-1 evals left to run after an eval change, and open registration pull requests |
| `model-watch`, daily | Reads the AI Gateway catalog, probes new flagship models against the team's provider allowlist, and opens a pull request that registers one, following [AGENTS.md](AGENTS.md#adding-a-new-experiment-model) |
| `publish-results`, daily | Opens or updates a pull request on nuxt/nuxt.com when `agent-results.json` on `main` differs from the published file |

Evals cost money, so they only run when the maintainer checks a box on the Evals Dashboard, or comments `@nuxt-evals` with a box's id there, like `@nuxt-evals sweep-tier1`, in the spirit of Renovate's Dependency Dashboard: one box for the tier-1 evals left to run, one per registration pull request, a smoke test, and boxes to run `model-watch` or `publish-results` now. Nobody else's checks reach the agent, and the dashboard's turns queue, so two sweeps never run at once. The `sweep` tool runs `agent-eval` in the agent's sandbox, one model at a time and up to four passes while evals are missing, exports, and commits the `summary.json`, `usage.json` and `classification.json` files and `agent-results.json`. The agent unchecks the box when it starts, shows what is running on the dashboard, and replies there when it is done.

The agent is deployed on the Nuxt Vercel team. Its model calls, the probe and the evals go through `AI_GATEWAY_API_KEY`, a vercel-labs AI Gateway key with a spending limit, so they keep the vercel-labs provider allowlist and billing that every result on the board was measured with. The eval sandboxes are created with the project's OIDC token. Set the key for Production only and mark it Sensitive: Preview deployments build pull request branches. It runs `main`'s scripts and takes only the experiment files from a pull request, and `pnpm run sweep plan` refuses an experiment that is not a plain config. Experiments on a harness other than `vercel-ai-gateway/*` are skipped, since the agent has no credentials for them. `pnpm run sweep plan` prints what a sweep would run, for free.

The agent's GitHub App can open and edit pull requests and issues on nuxt/nuxt-evals and nuxt/nuxt.com and push `agent/*` branches, only in turns a schedule or the maintainer started. `agent/lib/github.ts` enforces it.

```bash
pnpm run test:agent        # the GitHub access rules
pnpm run typecheck:agent
npx eve dev                # run the agent locally
```

## Models

| Experiment | Agent | Model |
|------------|-------|-------|
| `claude-opus-4.6` | `vercel-ai-gateway/claude-code` | `anthropic/claude-opus-4.6` |
| `claude-opus-4.7` | `vercel-ai-gateway/claude-code` | `anthropic/claude-opus-4.7` |
| `claude-opus-4.8` | `vercel-ai-gateway/claude-code` | `anthropic/claude-opus-4.8` |
| `claude-opus-5` | `vercel-ai-gateway/claude-code` | `anthropic/claude-opus-5` |
| `claude-opus-5.5` | `vercel-ai-gateway/claude-code` | `anthropic/claude-opus-5.5` |
| `claude-fable-5` | `vercel-ai-gateway/claude-code` | `anthropic/claude-fable-5` |
| `claude-fable-5.1` | `vercel-ai-gateway/claude-code` | `anthropic/claude-fable-5.1` |
| `claude-fable-5.2` | `vercel-ai-gateway/claude-code` | `anthropic/claude-fable-5.2` |
| `claude-sonnet-4.5` | `vercel-ai-gateway/claude-code` | `anthropic/claude-sonnet-4.5` |
| `claude-sonnet-4.6` | `vercel-ai-gateway/claude-code` | `anthropic/claude-sonnet-4.6` |
| `claude-sonnet-5` | `vercel-ai-gateway/claude-code` | `anthropic/claude-sonnet-5` |
| `claude-sonnet-5.5` | `vercel-ai-gateway/claude-code` | `anthropic/claude-sonnet-5.5` |
| `cursor-composer-2.0` | `cursor` | `composer-2` |
| `cursor-composer-2.5` | `cursor` | `composer-2.5` |
| `deepseek-v4-pro` | `vercel-ai-gateway/opencode` | `vercel/deepseek/deepseek-v4-pro-0813` |
| `gemini-3.1-pro-preview` | `vercel-ai-gateway/opencode` | `vercel/google/gemini-3.1-pro-preview` |
| `gemini-4-argon` | `vercel-ai-gateway/opencode` | `vercel/google/gemini-4-argon` |
| `gemini-4-carbon` | `vercel-ai-gateway/opencode` | `vercel/google/gemini-4-carbon` |
| `gemini-4-neon` | `vercel-ai-gateway/opencode` | `vercel/google/gemini-4-neon` |
| `glm-5.3` | `vercel-ai-gateway/opencode` | `vercel/zai/glm-5.3` |
| `gpt-5.3-codex-xhigh` | `vercel-ai-gateway/codex` | `openai/gpt-5.3-codex?reasoningEffort=xhigh` |
| `gpt-5.4-xhigh` | `vercel-ai-gateway/codex` | `openai/gpt-5.4?reasoningEffort=xhigh` |
| `gpt-5.5-pro` | `vercel-ai-gateway/codex` | `openai/gpt-5.5-pro` |
| `gpt-5.6-sol-xhigh` | `vercel-ai-gateway/codex` | `openai/gpt-5.6-sol?reasoningEffort=xhigh` |
| `gpt-6-astra-high` | `vercel-ai-gateway/codex` | `openai/gpt-6-astra?reasoningEffort=high` |
| `gpt-6-sol-high` | `vercel-ai-gateway/codex` | `openai/gpt-6-sol?reasoningEffort=high` |
| `gpt-6.1-sol-high` | `vercel-ai-gateway/codex` | `openai/gpt-6.1-sol?reasoningEffort=high` |
| `gpt-6.2-astra-high` | `vercel-ai-gateway/codex` | `openai/gpt-6.2-astra?reasoningEffort=high` |
| `gpt-6.2-sol-high` | `vercel-ai-gateway/codex` | `openai/gpt-6.2-sol?reasoningEffort=high` |
| `grok-4.7` | `vercel-ai-gateway/opencode` | `vercel/spacexai/grok-4.7` |
| `kimi-k2.6` | `vercel-ai-gateway/opencode` | `vercel/moonshotai/kimi-k2.6` |
| `kimi-k2.7-code` | `vercel-ai-gateway/opencode` | `vercel/moonshotai/kimi-k2.7-code` |
| `kimi-k3` | `vercel-ai-gateway/opencode` | `vercel/moonshotai/kimi-k3` |
| `kimi-k3.1-pro` | `vercel-ai-gateway/opencode` | `vercel/moonshotai/kimi-k3.1-pro` |
| `minimax-m2.7` | `vercel-ai-gateway/opencode` | `vercel/minimax/minimax-m2.7` |
| `minimax-m3` | `vercel-ai-gateway/opencode` | `vercel/minimax/minimax-m3` |
| `muse-spark-open` | `vercel-ai-gateway/opencode` | `vercel/meta/muse-spark-open` |

## Eval structure

Each eval is a self-contained Nuxt project in `evals/`. Most evals provide broken or suboptimal starter code that the agent must fix. The prompt describes a symptom without revealing the solution.

```
evals/nuxt-000-fix-data-fetching/
├── PROMPT.md          # task given to the agent
├── EVAL.ts            # vitest assertions (withheld from the agent)
├── package.json       # Nuxt project manifest
├── nuxt.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── server/
│   └── api/
│       └── greeting.ts
└── app/
    ├── app.vue
    └── pages/
        └── index.vue  # broken starter code the agent must fix
```

| File | Purpose |
|------|---------|
| `PROMPT.md` | The task prompt sent to the agent |
| `EVAL.ts` | Test file run after the agent finishes (withheld from agent) |
| `package.json` | Must have `"type": "module"` and a `"build"` script |
| Everything else | Source files the agent can see and modify |

## Adding a new eval

1. Create a directory under `evals/` (e.g., `evals/nuxt-015-my-eval/`)
2. Add `PROMPT.md` with a vague, symptom-based task description (don't reveal the solution)
3. Add broken or suboptimal starter code in `app/` for the agent to fix
4. Add `EVAL.ts` with vitest assertions that check for the correct fix and reject anti-patterns
5. Add `package.json` with `"type": "module"` and `"build": "nuxt build"`
6. Run it for tier-1 models only (see [Model retention policy](#model-retention-policy)). Tier-2 models keep their last measurement and are not rerun

## Adding a new model

Follow the checklist in [AGENTS.md](AGENTS.md#adding-a-new-experiment-model): the experiment config, its display name, harness name and list price, a row in the table above, and its tier in `scripts/tier-one.ts`. Then run it with `pnpm run eval <name>`.

## Model retention policy

Mirrors [nextjs.org/evals](https://github.com/vercel/next-evals-oss#model-retention-policy). The published board has two tiers:

- **Tier 1 (current)**: models with a complete run of the current eval set. Tier 1 carries the **latest model of each product line**, and a new version moves its predecessor to tier 2 once it has a complete run of its own. Sibling lines count separately, but only flagship or coding-focused models are measured: no budget or fast variants. A tier-1 model that goes stale because the eval set moved on gets rerun, not left on old measurements. Tier 1 only holds models the agent can rerun, which means a `vercel-ai-gateway/*` harness, so Cursor Composer is tier 2.
- **Tier 2 (previously measured)**: every other model keeps its last measured results for reference, dated by its `timestamp`, and is not rerun.

Tier 1 is scored over the full current eval set: an eval it never ran exports with `notAvailable: true` and counts as not passed until it is rerun. Tier 2 is scored over the evals it was measured on, so adding an eval doesn't lower it. An eval that changed since a model's last run keeps that last result.

`TIER_ONE_EXPERIMENTS` in `scripts/tier-one.ts` is the list, and each experiment exports a `tier` field. When the eval set changes, rerun only tier 1:

```bash
pnpm run eval:tier1:status   # what each tier-1 experiment is missing
pnpm run eval:tier1          # run it
```

## Publishing to nuxt.com/evals

The agent opens the pull request on nuxt/nuxt.com once new results reach `main` (see [Automation](#automation)). To do it by hand:

```bash
pnpm run export-results
cp agent-results.json <path-to-nuxt.com>/public/agent-results.json
```

Then open a pull request on nuxt/nuxt.com with that file.

## Current evals

### Nuxt (22)

| Eval | Type | Tests |
|------|------|-------|
| nuxt-000-fix-data-fetching | fix | Replace onMounted + $fetch with useFetch |
| nuxt-001-prefer-nuxt-link | fix | Replace `<a href>` with `<NuxtLink to>` |
| nuxt-002-state-composables | build | State management with useState composable |
| nuxt-003-page-meta | build | Page meta, useHead, and custom layouts |
| nuxt-004-error-handling | build | Error handling with NuxtErrorBoundary |
| nuxt-005-fix-seo-meta | fix | Replace useHead meta arrays with useSeoMeta |
| nuxt-006-runtime-config | build | Runtime config with public vs private keys |
| nuxt-007-avoid-redundant-ref | fix | Replace ref + watch with computed for derived state |
| nuxt-008-fix-exposed-secret | fix | Move private runtimeConfig access to server API route |
| nuxt-009-cache-api-response | fix | Replace defineEventHandler with defineCachedEventHandler |
| nuxt-010-fix-watch-fetch | fix | Replace watch + $fetch with useFetch reactive URL |
| nuxt-011-fix-sequential-fetching | fix | Parallelize sequential await useFetch with Promise.all |
| nuxt-012-nuxt3-to-nuxt4-migration | fix | Migrate Nuxt 3 directory structure to Nuxt 4 |
| nuxt-013-prefer-nuxt-image | fix | Replace raw `<img>` with NuxtImg + @nuxt/image |
| nuxt-014-prefer-use-cookie | fix | Replace document.cookie with useCookie composable |
| nuxt-015-shared-source-of-truth | fix | Deduplicate app and server utils into the shared/ directory |
| nuxt-016-hydration-mismatch | build | Render a load timestamp without an SSR hydration mismatch |
| nuxt-017-shallow-reactivity | fix | Make a nested mutation reactive on useFetch shallowRef data |
| nuxt-018-nuxt5-migration | fix | Opt into compatibilityVersion 5 and update deprecated data fetching |
| nuxt-019-nuxt5-runtime-semantics | fix | Reserve client-only space with ClientOnly and target Vite environments |
| nuxt-020-fix-nuxt-module | fix | Fix a local module's meta, namespacing, config merging, and dependencies |
| nuxt-021-custom-fetch-client | fix | Replace a `globalThis.$fetch` override with a provided `$fetch.create` client |

### Nuxt Content (2)

| Eval | Type | Tests |
|------|------|-------|
| nuxt-content-000-navigation | build | Documentation site with queryCollectionNavigation sidebar |
| nuxt-content-001-data-collection | build | Data collection (type "data") with JSON files |

### Nuxt UI (8)

| Eval | Type | Tests |
|------|------|-------|
| nuxt-ui-000-theming | build | Theming with app.config.ts colors and semantic utilities |
| nuxt-ui-001-fix-raw-html-page | fix | Replace raw HTML with UHeader/UFooter/UPageHero/UPageSection |
| nuxt-ui-002-dashboard-layout | build | Dashboard with UDashboardGroup/Sidebar/Panel |
| nuxt-ui-003-fix-raw-form | fix | Replace raw form with UForm + Zod validation |
| nuxt-ui-004-table | build | Data table with UTable, columns, and search |
| nuxt-ui-005-modal | build | Modal overlay with UModal and v-model:open |
| nuxt-ui-006-command-palette | build | Command palette with UCommandPalette and keyboard shortcuts |
| nuxt-ui-007-dropdown-menu | build | Dropdown menu with grouped items, icons, and onSelect |

## License

See [LICENSE](LICENSE).
