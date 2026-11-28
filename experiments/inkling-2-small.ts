import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/thinkingmachines/inkling-2-small',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  // Repository default: next-evals-oss has no experiment for it and its line has no predecessor
  timeout: 720,
  sandbox: 'vercel',
};

export default config;
