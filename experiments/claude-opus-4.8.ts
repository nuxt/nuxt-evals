import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'claude-code',
  model: 'claude-opus-4-8',
  agentOptions: {
    cliPackage: '@anthropic-ai/claude-code@next',
  },
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 1200,
  sandbox: 'vercel',
};

export default config;
