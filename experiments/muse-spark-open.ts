import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/meta/muse-spark-open',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  // next-evals-oss registers it at 2400
  timeout: 2400,
  sandbox: 'vercel',
};

export default config;
