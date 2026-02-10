# Nuxt Evals

Agent evaluations for Nuxt coding tasks, powered by [`@vercel/agent-eval`](https://www.npmjs.com/package/@vercel/agent-eval).

## Setup

```bash
pnpm install
cp .env.example .env   # requires VERCEL_OIDC_TOKEN and AI_GATEWAY_API_KEY
```

## Scripts

### `pnpm run eval`

Runs agent evaluations.

```bash
pnpm run eval                          # Run all experiments
pnpm run eval -- claude-opus-4.6       # Run a specific experiment
pnpm run eval:smoke                    # Run smoke test (1 eval per experiment)
pnpm run eval:dry                      # Preview what would run
```

### `pnpm run export-results`

Exports clean results to `agent-results.json`.

```bash
pnpm run export-results                          # Export from all experiments
pnpm run export-results -- claude-opus-4.6       # Export specific experiment
```

## Models

| Experiment | Agent | Model |
|------------|-------|-------|
| `claude-opus-4.6` | `claude-code` | (default) |
| `claude-sonnet-4.5` | `claude-code` | `sonnet` |
| `deepseek-v3.2` | `opencode` | `vercel/deepseek/deepseek-v3.2` |
| `devstral-2` | `opencode` | `vercel/mistral/devstral-2` |
| `gemini-3-pro-preview` | `opencode` | `vercel/google/gemini-3-pro-preview` |
| `gpt-5.2-codex` | `opencode` | `vercel/openai/gpt-5.2-codex` |
| `kat-coder-pro-v1` | `opencode` | `vercel/kwaipilot/kat-coder-pro-v1` |
| `minimax-m2.1` | `opencode` | `vercel/minimax/minimax-m2.1` |
| `claude-sonnet-4.5-with-mcp` | `claude-code` | `sonnet` + Nuxt MCP servers |
| `claude-opus-4.6-nuxt-ui-only` | `claude-code` | (default, Nuxt UI evals only) |

## Eval structure

Each eval is a self-contained Nuxt project in `evals/`:

```
evals/000-server-api-route/
├── PROMPT.md          # task given to the agent
├── EVAL.ts            # vitest assertions (withheld from the agent)
├── package.json       # Nuxt project manifest
├── nuxt.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── app/
    └── app.vue
```

| File | Purpose |
|------|---------|
| `PROMPT.md` | The task prompt sent to the agent |
| `EVAL.ts` | Test file run after the agent finishes (withheld from agent) |
| `package.json` | Must have `"type": "module"` and a `"build"` script |
| Everything else | Source files the agent can see and modify |

## Adding a new eval

1. Create a directory under `evals/` (e.g., `evals/010-my-eval/`)
2. Add `PROMPT.md` with the task description
3. Add `EVAL.ts` with vitest assertions
4. Add `package.json` with `"type": "module"` and `"build": "nuxt build"`
5. Add the Nuxt source files the agent starts with
6. Run `pnpm run eval` — it will automatically run the new eval for all models

## Adding a new model

1. Create a config in `experiments/` (e.g., `experiments/my-model.ts`)
2. Add the display name to `MODEL_NAMES` in `scripts/export-results.ts`
3. Run `pnpm run eval` — it will automatically run all evals for the new model

## Current evals

| Eval | Tests |
|------|-------|
| 000-server-api-route | Server API route and data fetching with useFetch |
| 001-routing | Nuxt routing with NuxtLink navigation |
| 002-route-middleware | Route middleware for authentication |
| 003-state-composables | State management with useState composable |
| 004-page-meta | Page meta, useHead, and custom layouts |
| 005-nuxt-ui-installation | Nuxt UI installation and configuration |
| 006-nuxt-ui-landing-page | Landing page with UPageHero/UPageSection |
| 007-nuxt-ui-form | Forms with UForm, Zod validation, useToast |
| 008-error-handling | Error handling with NuxtErrorBoundary |
| 009-data-fetching | External API data fetching with useFetch |

## License

See [LICENSE](LICENSE).
