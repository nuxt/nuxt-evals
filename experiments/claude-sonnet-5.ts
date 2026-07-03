import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/claude-code',
  model: 'anthropic/claude-sonnet-5',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 1200,
  sandbox: 'vercel',
};

export default config;
