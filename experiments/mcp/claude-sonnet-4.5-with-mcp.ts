import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'claude-code',
  model: 'claude-sonnet-4-5',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 720,
  sandbox: 'vercel',

  setup: async (sandbox) => {
    await sandbox.runCommand('claude', [
      'mcp', 'add',
      '--transport', 'http',
      'nuxt-docs',
      'https://nuxt.com/mcp',
    ]);
    await sandbox.runCommand('claude', [
      'mcp', 'add',
      '--transport', 'http',
      'nuxt-ui-docs',
      'https://ui.nuxt.com/mcp',
    ]);
  },
};

export default config;
