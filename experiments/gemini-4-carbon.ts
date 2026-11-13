import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/google/gemini-4-carbon',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  // The smoke run took 16.5 min on the easiest eval, so give it more than
  // gemini-4-argon's 2400. Raising it after the first sweep would wipe the results.
  timeout: 3600,
  sandbox: 'vercel',
};

export default config;
