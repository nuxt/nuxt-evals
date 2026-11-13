import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/moonshotai/kimi-k3.1-pro',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  // next-evals-oss registers it at 2400
  timeout: 2400,
  sandbox: 'vercel',
};

export default config;
