import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/google/gemini-4-neon',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  // same budget as gemini-4-carbon, Google serving is slow on new Gemini 4 models
  timeout: 3600,
  sandbox: 'vercel',
};

export default config;
