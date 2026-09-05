import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/codex',
  // xhigh to stay comparable with the other Codex runs. The gateway also
  // offers max for this model; a bigger budget than its stablemates would
  // measure the budget, not the model.
  model: 'openai/gpt-6-astra?reasoningEffort=xhigh',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 1200,
  sandbox: 'vercel',
};

export default config;
