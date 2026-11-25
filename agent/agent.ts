import { defineAgent } from 'eve';

export default defineAgent({
  // The work is reading a catalog, editing five small files and running two
  // commands. Sweeps and exports run in GitHub Actions, not here.
  model: 'anthropic/claude-sonnet-5.5',
  reasoning: 'medium',
});
