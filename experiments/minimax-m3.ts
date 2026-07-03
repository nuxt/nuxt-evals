import type { ExperimentConfig } from '@vercel/agent-eval';

const config: ExperimentConfig = {
  agent: 'vercel-ai-gateway/opencode',
  model: 'vercel/minimax/minimax-m3',
  agentOptions: {
    binaryUrl: 'https://ymdea60kblwwhidh.public.blob.vercel-storage.com/opencode-linux-x64-minimax-m3',
  },
  scripts: ['build'],
  runs: 4,
  earlyExit: true,
  // minimax-m3 serving is slow under current demand; heavy evals need a longer budget
  timeout: 2400,
  sandbox: 'vercel',
};

export default config;
