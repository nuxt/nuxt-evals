import type { ExperimentConfig } from '@vercel/agent-eval';

/**
 * Nuxt UI evals only
 * Runs only the Nuxt UI related evaluations
 */
const config: ExperimentConfig = {
  agent: 'claude-code',
  evals: (name) => name.includes('nuxt-ui'),
  scripts: ['build'],
  runs: 2,
  earlyExit: true,
};

export default config;
