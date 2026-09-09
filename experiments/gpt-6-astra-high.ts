import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/codex',
  // high, not the xhigh/max ceiling, matching next-evals-oss. The gateway
  // accepts none/minimal/low/medium/high/xhigh/max for this id; xhigh scored
  // lower than medium here at 3x the cost, so the ceiling measured the pricing
  // tier rather than the model. high is the rung people actually run.
  model: 'openai/gpt-6-astra?reasoningEffort=high',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 1200,
  sandbox: 'vercel',
};

export default config;
