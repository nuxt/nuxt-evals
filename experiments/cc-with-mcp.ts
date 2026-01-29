import type { ExperimentConfig } from '@vercel/agent-eval';

/**
 * Run evals with MCP server configuration
 */
const config: ExperimentConfig = {
  agent: 'claude-code',
  model: 'sonnet',
  scripts: ['build'],
  runs: 2,
  earlyExit: true,

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
