/**
 * Cache API Response
 *
 * Tests whether the agent knows to use defineCachedEventHandler to cache
 * server API responses instead of hitting the external API on every request,
 * with the cache option actually configured (a duration or swr) rather than
 * just the bare option name appearing in the file.
 *
 * Tricky because the prompt just says "make it faster" — the agent must
 * infer that server-side caching with defineCachedEventHandler is the
 * right tool, not client-side caching or other optimization patterns.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getApiContent(): string {
  const apiPath = findFile(
    join(process.cwd(), 'server', 'api', 'posts.ts'),
    join(process.cwd(), 'server', 'api', 'posts.get.ts'),
  );

  expect(apiPath).toBeDefined();
  return readFileSync(apiPath!, 'utf-8');
}

test('API route uses a cached event handler', () => {
  const content = getApiContent();
  // Both defineCachedEventHandler and cachedEventHandler are valid Nitro exports
  expect(content).toMatch(/defineCachedEventHandler|cachedEventHandler/);
});

test('API route does NOT use plain defineEventHandler', () => {
  const content = getApiContent();

  // Should be the cached variant, not the standalone defineEventHandler.
  const hasPlainHandler = /(?<!defineCached|cached)defineEventHandler/.test(content);
  expect(hasPlainHandler).toBe(false);
});

test('Cache option is configured with an actual value (duration or swr)', () => {
  const content = getApiContent();

  // Not just the keyword — the option must be assigned a real value: a number
  // (maxAge: 60), an expression (maxAge: 60 * 60), a named constant
  // (maxAge: CACHE_TTL), or swr enabled (swr: true). A bare `maxAge` with no
  // value, or the word in a comment, does not count.
  expect(content).toMatch(/(?:maxAge|swr|staleMaxAge)\s*:\s*[\w(]/);
});

test('API route still fetches from jsonplaceholder', () => {
  const content = getApiContent();
  expect(content).toMatch(/jsonplaceholder/);
});

test('Page still displays posts', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');
  expect(content).toMatch(/v-for/);
  expect(content).toMatch(/title/);
});
