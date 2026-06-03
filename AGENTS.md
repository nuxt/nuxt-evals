# AGENTS.md

Guidance for agents working in this repo. This is a benchmark suite that runs coding agents against Nuxt tasks using [`@vercel/agent-eval`](https://www.npmjs.com/package/@vercel/agent-eval).

## Adding a new experiment (model)

When asked to add a new model/experiment, do all of the following, then commit:

1. **Create `experiments/<name>.ts`** with an `ExperimentConfig` default export (see conventions below).
2. **Add a display name** to the `MODEL_NAMES` map in `scripts/export-results.ts` (e.g. `'kimi-k2.6': 'Kimi K2.6'`). Without this, exported results fall back to the raw key.
3. **Check `HARNESS_NAMES`** in `scripts/export-results.ts`. If the experiment's `agent` value isn't already a key there, add it (e.g. `'vercel-ai-gateway/opencode': 'OpenCode'`). Without this, the harness falls back to the raw `agent` string.
4. **Add a row** to the Models table in `README.md` with `| \`<name>\` | \`<agent>\` | \`<model>\` |`.
5. **Commit per model** with message `feat(experiments): add <name>` (one model = one commit, bundling all the file changes).

Keep these in sync. Every `experiments/*.ts` file must have a matching `MODEL_NAMES` entry, a known `HARNESS_NAMES` key for its `agent`, and a README table row.

## Experiment config conventions

```ts
import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/moonshotai/kimi-k2.6',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 720,
  sandbox: 'vercel',
};

export default config;
```

- Use **single quotes** and 2-space indentation.
- Default `runs: 4`, `earlyExit: true`, `sandbox: 'vercel'`, `scripts: ['build']`, `timeout: 720`.
- Do **not** add a `setup` step that bumps a framework canary (the upstream next-evals repo does this for Next.js; we don't for Nuxt).

### Agent + model string by harness

| Harness (`agent`) | `model` format | Example |
|-------------------|----------------|---------|
| `claude-code` | dashed name | `claude-opus-4-8` |
| `cursor` | composer id | `composer-2.5` |
| `vercel-ai-gateway/opencode` | `vercel/<provider>/<model>` | `vercel/minimax/minimax-m2.7` |
| `vercel-ai-gateway/codex` | `openai/<model>` | `openai/gpt-5.5-pro` |
| `codex` | `<model>?reasoningEffort=<level>` | `gpt-5.3-codex?reasoningEffort=xhigh` |

- Bleeding-edge Claude models may need a canary CLI via `agentOptions: { cliPackage: '@anthropic-ai/claude-code@next' }` and a higher `timeout` (e.g. `1200`).
- Codex runs default `reasoningEffort` to `medium`; set it explicitly in the model string when you need otherwise.
