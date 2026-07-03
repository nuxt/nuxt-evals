import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/moonshotai/kimi-k2.7-code',
  agentOptions: {
    binaryUrl: 'https://ymdea60kblwwhidh.public.blob.vercel-storage.com/opencode-linux-x64-kimi-k2.7-code-v1',
  },
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  timeout: 720,
  sandbox: 'vercel',
};

export default config;
