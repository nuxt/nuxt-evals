import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/mistral/devstral-2',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 720,
  sandbox: 'vercel',
};

export default config;
