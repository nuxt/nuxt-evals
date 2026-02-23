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
| `cursor-composer-1.5` | `cursor` | `composer-1.5` |
| `deepseek-v3.2` | `opencode` | `vercel/deepseek/deepseek-v3.2` |
| `devstral-2` | `opencode` | `vercel/mistral/devstral-2` |
| `gemini-3-pro-preview` | `opencode` | `vercel/google/gemini-3-pro-preview` |
| `gemini-3-pro-preview-gemini-cli` | `gemini` | `gemini-3-pro-preview` |
| `gpt-5.3-codex-xhigh` | `codex` | `gpt-5.3-codex-api-preview?reasoningEffort=xhigh` |
| `kat-coder-pro-v1` | `opencode` | `vercel/kwaipilot/kat-coder-pro-v1` |
| `minimax-m2.1` | `opencode` | `vercel/minimax/minimax-m2.1` |
| `claude-sonnet-4.5-with-mcp` | `claude-code` | `claude-sonnet-4-5` + Nuxt MCP servers |

## Eval structure

Each eval is a self-contained Nuxt project in `evals/`:

```
evals/nuxt-000-server-api-route/
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

1. Create a directory under `evals/` (e.g., `evals/nuxt-007-my-eval/` or `evals/nuxt-ui-003-my-eval/`)
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

### Nuxt

| Eval | Tests |
|------|-------|
| nuxt-000-server-api-route | Server API route and data fetching with useFetch |
| nuxt-001-routing | Nuxt routing with NuxtLink navigation |
| nuxt-002-route-middleware | Route middleware for authentication |
| nuxt-003-state-composables | State management with useState composable |
| nuxt-004-page-meta | Page meta, useHead, and custom layouts |
| nuxt-005-error-handling | Error handling with NuxtErrorBoundary |
| nuxt-006-seo-meta | SEO with useSeoMeta and Open Graph tags |
| nuxt-007-runtime-config | Runtime config with public vs private keys |
| nuxt-008-plugins | Plugins with defineNuxtPlugin and provide pattern |
| nuxt-009-route-validation | Route parameter validation with definePageMeta validate |
| nuxt-010-app-config | App config with defineAppConfig and useAppConfig |
| nuxt-011-server-utils | Shared server utilities in server/utils/ |
| nuxt-012-lazy-fetch | Lazy data fetching with status-based loading states |
| nuxt-013-computed-url | Reactive data fetching with computed URLs |
| nuxt-014-parallel-fetch | Parallel data fetching with useAsyncData + Promise.all |

### Nuxt UI

| Eval | Tests |
|------|-------|
| nuxt-ui-000-installation | Nuxt UI installation and configuration |
| nuxt-ui-001-theming | Theming with app.config.ts colors and semantic utilities |
| nuxt-ui-002-page-shell | Page shell with UHeader/UMain/UFooter and UNavigationMenu |
| nuxt-ui-003-landing-page | Landing page with UPageHero/UPageSection |
| nuxt-ui-004-dashboard-layout | Dashboard layout with UDashboardGroup/Sidebar/Panel |
| nuxt-ui-005-form | Forms with UForm, Zod validation, useToast |
| nuxt-ui-006-table | Data table with UTable, columns, and search |
| nuxt-ui-007-modal | Modal overlay with UModal and v-model:open |
| nuxt-ui-008-command-palette | Command palette with UCommandPalette and keyboard shortcuts |
| nuxt-ui-009-dropdown-menu | Dropdown menu with grouped items, icons, and onSelect |

## License

See [LICENSE](LICENSE).
