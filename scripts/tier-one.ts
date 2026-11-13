/**
 * Tier-1 experiments per the README's "Model retention policy": the latest
 * model of each product line, and nothing it supersedes. Membership is a
 * commitment to rerun on every eval-set change. Everything else exports as
 * tier 2: previously measured, dated, not rerun.
 */
export const TIER_ONE_EXPERIMENTS = [
  'claude-fable-5.1',
  'claude-opus-5.5',
  'claude-sonnet-5.5',
  'cursor-composer-2.5',
  'deepseek-v4-pro',
  'gemini-4-argon',
  'glm-5.3',
  'gpt-6-astra-high',
  'gpt-6.1-sol-high',
  'grok-4.7',
  'kimi-k3',
  'minimax-m3',
] as const;


export const TIER_1 = new Set<string>(TIER_ONE_EXPERIMENTS);
