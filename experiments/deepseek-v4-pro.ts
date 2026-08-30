import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  // Only the dated 0813 snapshot is served by an allowlisted provider (Fireworks);
  // the undated `deepseek-v4-pro` id is routed to providers this team can't use.
  model: 'vercel/deepseek/deepseek-v4-pro-0813',
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 1200,
  sandbox: 'vercel',
};

export default config;
