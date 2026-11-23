import { APICallError, gateway, generateText } from 'ai';
import { defineTool } from 'eve/tools';
import { z } from 'zod';

export default defineTool({
  description: 'Send one tiny request to a model through the AI Gateway with this project\'s credentials, to learn whether the team\'s provider allowlist serves it. Costs a fraction of a cent. Returns the provider that answered and the billed cost when the gateway reports them. A 403 RestrictedProvidersError means no allowlisted provider serves the model, which experiment config cannot fix.',
  inputSchema: z.object({
    model: z.string().regex(/^[\w.-]+\/[\w.:-]+$/).describe('Gateway model id, like moonshotai/kimi-k3.1-pro.'),
  }),
  async execute({ model }, ctx) {
    try {
      const result = await generateText({
        model: gateway(model),
        prompt: 'Reply with the single word: ok',
        maxOutputTokens: 64,
        abortSignal: ctx.abortSignal,
      });
      return {
        served: true,
        text: result.text.slice(0, 80),
        usage: result.usage,
        // Routing and cost as the gateway reports them. usage.cost is what was
        // billed, market_cost the provider's list price.
        gateway: result.providerMetadata?.gateway ?? null,
      };
    } catch (error) {
      if (APICallError.isInstance(error)) {
        return { served: false, status: error.statusCode ?? null, error: String(error.responseBody ?? error.message).slice(0, 600) };
      }
      return { served: false, status: null, error: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 600) : String(error) };
    }
  },
});
