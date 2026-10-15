import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/google/gemini-4-argon',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  // next-evals-oss saw ~16 min on the slowest Argon attempt
  timeout: 2400,
  sandbox: 'vercel',
};

export default config;
