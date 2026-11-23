#!/usr/bin/env node
// Compares two agent-results.json files and prints what a nuxt.com pull
// request needs: whether anything changed, and its title.
//
//   node bin/results-diff.mjs <published.json> <new.json>
import { readFileSync } from 'node:fs';

const [publishedPath, newPath] = process.argv.slice(2);
if (!publishedPath || !newPath) {
  console.error('Usage: results-diff.mjs <published.json> <new.json>');
  process.exit(2);
}

const read = (path) => JSON.parse(readFileSync(path, 'utf-8'));
const published = read(publishedPath);
const next = read(newPath);

// exportedAt moves on every export, so it is not a change on its own.
const comparable = (data) => JSON.stringify({ ...data, metadata: { ...data.metadata, exportedAt: null } });
const changed = comparable(published) !== comparable(next);

const known = new Set(published.metadata.experiments.map((experiment) => experiment.name));
const added = next.metadata.experiments
  .filter((experiment) => !known.has(experiment.name))
  .map((experiment) => `\`${experiment.modelName}\``);

const list = added.length > 1 ? `${added.slice(0, -1).join(', ')} and ${added.at(-1)}` : added[0];
const title = added.length > 0 ? `feat(evals): add ${list} results` : 'feat(evals): refresh results';

console.log(JSON.stringify({ changed, added, title }, null, 2));
