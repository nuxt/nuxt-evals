import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/codex',
  model: 'openai/gpt-5.5-pro',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 1800,
  sandbox: 'vercel',
};

export default config;
