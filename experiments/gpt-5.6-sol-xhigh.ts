import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/codex',
  // xhigh to stay comparable with gpt-5.3-codex / gpt-5.4. The Codex CLI also
  // accepts max and ultra for this model, but a bigger budget than its
  // stablemates would measure the budget, not the model.
  //
  // next-evals-oss threw away an early gpt-5.6-sol run whose every transcript
  // logged `Model metadata for gpt-5.6[-sol] not found. Defaulting to fallback
  // metadata` — their CLI predated the model. codex 0.145.0 carries gpt-5.6-sol
  // in its registry, so smoke first and grep the transcript for
  // `fallback metadata` to confirm the installed CLI is new enough.
  model: 'openai/gpt-5.6-sol?reasoningEffort=xhigh',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 1200,
  sandbox: 'vercel',
};

export default config;
