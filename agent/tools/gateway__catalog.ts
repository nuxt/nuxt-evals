import { defineTool } from 'eve/tools';
import { z } from 'zod';

interface CatalogModel {
  id: string;
  name?: string;
  description?: string;
  released?: number;
  type?: string;
  tags?: string[];
  context_window?: number;
  reasoning_options?: unknown;
  pricing?: Record<string, unknown>;
}

const perMillion = (value: unknown) => (typeof value === 'string' && value !== '' ? Number((Number(value) * 1_000_000).toFixed(4)) : null);

export default defineTool({
  description: 'List the language models the AI Gateway catalog released recently, newest first, with their description, release date and catalog price per 1M tokens. The catalog is public and is not filtered by the team allowlist, so a model listed here may still be blocked: probe it. Catalog prices can differ from what is billed.',
  inputSchema: z.object({
    days: z.number().int().min(1).max(365).default(45).describe('How far back to look, by release date.'),
  }),
  async execute({ days }) {
    const response = await fetch('https://ai-gateway.vercel.sh/v1/models');
    if (!response.ok) throw new Error(`The gateway catalog answered ${response.status}.`);
    const { data } = await response.json() as { data: CatalogModel[] };
    const since = Date.now() / 1000 - days * 86_400;
    return data
      .filter((model) => model.type === 'language' && (model.released ?? 0) >= since && model.tags?.includes('tool-use'))
      .sort((a, b) => (b.released ?? 0) - (a.released ?? 0))
      .map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        released: new Date((model.released ?? 0) * 1000).toISOString().slice(0, 10),
        contextWindow: model.context_window,
        reasoningOptions: model.reasoning_options,
        tags: model.tags,
        pricePerMillion: {
          input: perMillion(model.pricing?.input),
          output: perMillion(model.pricing?.output),
          cacheRead: perMillion(model.pricing?.input_cache_read),
          cacheWrite: perMillion(model.pricing?.input_cache_write),
          variesByProvider: model.pricing?.varies_by_provider === true,
        },
      }));
  },
});
