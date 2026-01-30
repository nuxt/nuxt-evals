# Nuxt Evals

Agent evaluations for Nuxt coding tasks, powered by [`@vercel/agent-eval`](https://www.npmjs.com/package/@vercel/agent-eval).

## Setup

```bash
pnpm install
cp .env.example .env   # requires VERCEL_OIDC_TOKEN and AI_GATEWAY_API_KEY
```

## Usage

```bash
# Dry run — validate all 10 fixtures load correctly
npx agent-eval cc --dry

# Run all evals
npx agent-eval cc

# Smoke test — run a single eval (000-server-api-route)
npx agent-eval cc-smoke

# Run with Nuxt MCP servers (provides documentation access)
npx agent-eval cc-with-mcp
```

Experiment configs live in `experiments/`:

- **`cc.ts`** — runs all evals with Claude Code via Vercel AI Gateway
- **`cc-smoke.ts`** — runs only `000-server-api-route` for quick validation
- **`cc-with-mcp.ts`** — runs all evals with Nuxt & Nuxt UI MCP servers

## Eval structure

Each eval is a self-contained Nuxt.js project in `evals/`:

```
evals/000-server-api-route/
├── PROMPT.md          # task given to the agent
├── EVAL.ts            # vitest assertions (withheld from the agent)
├── package.json       # Nuxt.js project manifest
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

The framework automatically:
- Withholds `EVAL.ts` and `*.test.ts`/`*.test.tsx` from the agent
- Creates a vitest config in the sandbox
- Runs `EVAL.ts` via `npx vitest run EVAL.ts` to score the result

## Adding a new eval

1. Create a directory under `evals/` (e.g., `evals/010-my-eval/`)
2. Add `PROMPT.md` with the task description
3. Add `EVAL.ts` with vitest assertions
4. Add `package.json` with `"type": "module"` and `"build": "nuxt build"`
5. Add the Nuxt.js source files the agent starts with
6. Verify: `npx agent-eval cc --dry`

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

MIT
