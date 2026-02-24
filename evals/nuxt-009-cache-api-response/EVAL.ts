/**
 * Cache API Response
 *
 * Tests whether the agent knows to use defineCachedEventHandler to cache
 * server API responses instead of hitting the external API on every request.
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

test('API route uses defineCachedEventHandler', () => {
  const apiPath = findFile(
    join(process.cwd(), 'server', 'api', 'posts.ts'),
    join(process.cwd(), 'server', 'api', 'posts.get.ts'),
  );

  expect(apiPath).toBeDefined();

  const content = readFileSync(apiPath!, 'utf-8');
  expect(content).toMatch(/defineCachedEventHandler/);
});

test('API route does NOT use plain defineEventHandler', () => {
  const apiPath = findFile(
    join(process.cwd(), 'server', 'api', 'posts.ts'),
    join(process.cwd(), 'server', 'api', 'posts.get.ts'),
  );

  expect(apiPath).toBeDefined();

  const content = readFileSync(apiPath!, 'utf-8');

  // Should NOT have defineEventHandler (should be defineCachedEventHandler)
  // But defineCachedEventHandler contains "defineEventHandler" as substring,
  // so check it's not the standalone version
  const hasPlainHandler = /(?<!defineCached)defineEventHandler/.test(content);
  expect(hasPlainHandler).toBe(false);
});

test('Cache has maxAge or swr configuration', () => {
  const apiPath = findFile(
    join(process.cwd(), 'server', 'api', 'posts.ts'),
    join(process.cwd(), 'server', 'api', 'posts.get.ts'),
  );

  expect(apiPath).toBeDefined();

  const content = readFileSync(apiPath!, 'utf-8');
  expect(content).toMatch(/maxAge|swr|staleMaxAge/);
});

test('API route still fetches from jsonplaceholder', () => {
  const apiPath = findFile(
    join(process.cwd(), 'server', 'api', 'posts.ts'),
    join(process.cwd(), 'server', 'api', 'posts.get.ts'),
  );

  expect(apiPath).toBeDefined();

  const content = readFileSync(apiPath!, 'utf-8');
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
