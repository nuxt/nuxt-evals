import type { ExperimentConfig } from '@vercel/agent-eval';

/**
 * OpenCode experiment with Kimi K2.5 model
 * Tests all Nuxt evals using Moonshot AI's Kimi K2.5 via Vercel AI Gateway
 */
const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'moonshotai/kimi-k2.5',
  scripts: ['build'],
  runs: 2,
  earlyExit: true,
};

export default config;
