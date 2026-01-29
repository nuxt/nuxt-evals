import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'claude-code',
  evals: ['000-server-api-route'],
  scripts: ['build'],
};

export default config;
