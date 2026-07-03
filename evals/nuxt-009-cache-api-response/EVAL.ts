/**
 * Cache API Response
 *
 * Tests whether the agent knows to cache the server API response instead of
 * hitting the external API on every request, with the cache actually
 * configured (a duration or swr) rather than just the option name appearing.
 *
 * All documented Nitro/Nuxt server-side caching mechanisms are accepted:
 * - defineCachedEventHandler / cachedEventHandler
 * - defineCachedFunction / cachedFunction wrapping the fetch
 * - routeRules caching for the API route in nuxt.config
 *
 * Tricky because the prompt just says "make it faster" — the agent must
 * infer that server-side caching is the right tool, not client-side caching
 * or other optimization patterns. Checks run on comment-stripped source.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function getApiContent(): string {
  const apiPath = findFile(
    join(process.cwd(), 'server', 'api', 'posts.ts'),
    join(process.cwd(), 'server', 'api', 'posts.get.ts'),
    join(process.cwd(), 'server', 'api', 'posts', 'index.ts'),
    join(process.cwd(), 'server', 'api', 'posts', 'index.get.ts'),
  );

  expect(apiPath).toBeDefined();
  return stripComments(readFileSync(apiPath!, 'utf-8'));
}

function getConfigContent(): string {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  if (!existsSync(configPath)) return '';
  return stripComments(readFileSync(configPath, 'utf-8'));
}

function usesCachedHandler(content: string): boolean {
  return /defineCachedEventHandler|cachedEventHandler/.test(content);
}

function usesCachedFunction(content: string): boolean {
  return /defineCachedFunction|cachedFunction/.test(content);
}

function usesRouteRuleCache(config: string): boolean {
  // routeRules: { '/api/posts': { cache: ... } } (or swr/isr shorthands)
  return (
    /routeRules/.test(config) &&
    /['"`]\/api\/posts[^'"`]*['"`]\s*:\s*\{[^}]*(?:cache|swr|isr)/.test(config)
  );
}

test('API response is cached server-side', () => {
  const api = getApiContent();
  const config = getConfigContent();

  expect(
    usesCachedHandler(api) || usesCachedFunction(api) || usesRouteRuleCache(config),
  ).toBe(true);
});

test('Plain defineEventHandler only remains when caching happens elsewhere', () => {
  const api = getApiContent();
  const config = getConfigContent();

  const hasPlainHandler = /(?<!defineCached|cached)defineEventHandler/.test(api);

  if (hasPlainHandler) {
    // A plain handler is fine when the caching lives in a cached function
    // or a route rule — otherwise nothing is cached.
    expect(usesCachedFunction(api) || usesRouteRuleCache(config)).toBe(true);
  }
});

test('Cache option is configured with an actual value (duration or swr)', () => {
  const api = getApiContent();
  const config = getConfigContent();
  const combined = api + '\n' + config;

  // Not just the keyword — the option must be assigned a real value: a number
  // (maxAge: 60), an expression (maxAge: 60 * 60), a named constant
  // (maxAge: CACHE_TTL), swr enabled (swr: true), or an isr/cache rule.
  expect(combined).toMatch(/(?:maxAge|staleMaxAge|swr|isr)\s*:\s*[\w(]/);
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
