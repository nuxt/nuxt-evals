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
| `claude-opus-4.6` | `claude-code` | `claude-opus-4-6` |
| `claude-sonnet-4.5` | `claude-code` | `claude-sonnet-4-5` |
| `claude-sonnet-4.6` | `claude-code` | `claude-sonnet-4-6` |
| `cursor-composer-1.5` | `cursor` | `composer-1.5` |
| `gemini-3-pro-preview` | `opencode` | `vercel/google/gemini-3-pro-preview` |
| `gemini-3-pro-preview-gemini-cli` | `gemini` | `gemini-3-pro-preview` |
| `gpt-5.3-codex-xhigh` | `codex` | `gpt-5.3-codex-api-preview?reasoningEffort=xhigh` |

## Eval structure

Each eval is a self-contained Nuxt project in `evals/`. Most evals provide broken or suboptimal starter code that the agent must fix — the prompt describes a symptom without revealing the solution.

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
6. Run `pnpm run eval` — it will automatically run the new eval for all models

## Adding a new model

1. Create a config in `experiments/` (e.g., `experiments/my-model.ts`)
2. Add the display name to `MODEL_NAMES` in `scripts/export-results.ts`
3. Run `pnpm run eval` — it will automatically run all evals for the new model

## Current evals

### Nuxt (15)

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
