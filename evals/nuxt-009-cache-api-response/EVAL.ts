/**
 * Cache API Response
 *
 * Tests whether the agent caches the server API response instead of hitting the
 * external API on every request, with the cache actually configured. Verified
 * against nuxt 4.6.4 / nitropack 2.13.6, where the Nitro cache helpers are
 * still auto-imported in server/ (or imported from `nitropack/runtime`).
 *
 * All documented Nitro/Nuxt server-side caching mechanisms are accepted:
 * - defineCachedEventHandler / cachedEventHandler on the posts route
 * - defineCachedFunction / cachedFunction, defined in the route or in
 *   server/utils, as long as the posts route calls it
 * - a routeRules entry whose pattern matches /api/posts (exact, `/api/**`,
 *   `/api/posts/**`...) with cache, swr or isr, in nuxt.config or nitro
 *
 * The cache must be given a real value. Nitro defaults a cached handler to
 * `maxAge: 1`, so a bare defineCachedEventHandler barely caches. `swr: false`
 * alone leaves that 1s default, and `maxAge: 0` is not counted as a real
 * duration.
 *
 * Tricky because the prompt just says "make it faster": the agent must infer
 * that server-side caching is the right tool, not client-side caching or other
 * optimization patterns. Checks run on comment-stripped source.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collectFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full, exts));
    else if (exts.some(e => entry.endsWith(e))) out.push(full);
  }
  return out;
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

function getUtilsContent(): string {
  return collectFiles(join(process.cwd(), 'server', 'utils'), ['.ts', '.js', '.mjs'])
    .map(file => stripComments(readFileSync(file, 'utf-8')))
    .join('\n');
}

function getConfigContent(): string {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  if (!existsSync(configPath)) return '';
  return stripComments(readFileSync(configPath, 'utf-8'));
}

/** The balanced `{ ... }` starting at `start`. */
function balancedBlock(content: string, start: number): string {
  let depth = 0;
  for (let j = start; j < content.length; j++) {
    if (content[j] === '{') depth++;
    else if (content[j] === '}') {
      depth--;
      if (depth === 0) return content.slice(start, j + 1);
    }
  }
  return content.slice(start);
}

function usesCachedHandler(content: string): boolean {
  return /defineCachedEventHandler|cachedEventHandler/.test(content);
}

/** A cached function defined in the route or in server/utils, and called by the route. */
function usesCachedFunction(api: string, utils: string): boolean {
  const names = [...(api + '\n' + utils).matchAll(
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:defineCachedFunction|cachedFunction)\s*(?:<[^>]*>)?\s*\(/g,
  )].map(m => m[1]);

  return names.some(name => new RegExp(`\\b${name}\\s*\\(`).test(api));
}

/** Whether a route rule pattern (`/api/**`, `/api/posts`, `/api/:name`...) matches a path. */
function patternMatches(pattern: string, path: string): boolean {
  const source = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/\*\*/g, '\u0000')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/:\w+/g, '[^/]+')
    .replace(/\u0000/g, '(?:/.*)?');
  return new RegExp(`^${source}$`).test(path);
}

/** routeRules: { '/api/posts': { cache: ... } } (or swr/isr shorthands, or a matching glob). */
function usesRouteRuleCache(config: string): boolean {
  if (!/routeRules/.test(config)) return false;

  for (const m of config.matchAll(/['"`](\/[^'"`]*)['"`]\s*:\s*\{/g)) {
    if (!patternMatches(m[1], '/api/posts')) continue;
    const rule = balancedBlock(config, m.index! + m[0].length - 1);
    if (/\b(?:cache|swr|isr)\s*:\s*(?!false\b)\S/.test(rule)) return true;
  }
  return false;
}

test('API response is cached server-side', () => {
  const api = getApiContent();
  const utils = getUtilsContent();
  const config = getConfigContent();

  expect(
    usesCachedHandler(api) || usesCachedFunction(api, utils) || usesRouteRuleCache(config),
  ).toBe(true);
});

test('Plain defineEventHandler only remains when caching happens elsewhere', () => {
  const api = getApiContent();
  const utils = getUtilsContent();
  const config = getConfigContent();

  const hasPlainHandler = /(?<!defineCached|cached)defineEventHandler/.test(api);

  if (hasPlainHandler) {
    // A plain handler is fine when it calls a cached function or a route rule
    // caches it. Otherwise nothing is cached.
    expect(usesCachedFunction(api, utils) || usesRouteRuleCache(config)).toBe(true);
  }
});

test('Cache option is configured with an actual value (duration or swr)', () => {
  const combined = getApiContent() + '\n' + getUtilsContent() + '\n' + getConfigContent();

  // Not just the keyword: the option must be assigned a real value, such as a
  // number (maxAge: 60), an expression (maxAge: 60 * 60), a named constant
  // (maxAge: CACHE_TTL or the `{ maxAge }` shorthand), swr enabled (swr: true)
  // or an isr rule. `false` and `0` aren't a chosen duration, so they don't count.
  const assigned = /(?:maxAge|staleMaxAge|swr|isr)\s*:\s*(?!false\b|0(?![.\d]))[\w(]/.test(combined);
  const shorthand = /[{,]\s*(?:maxAge|staleMaxAge)\s*[,}]/.test(combined);

  expect(assigned || shorthand).toBe(true);
});

test('API route still fetches from jsonplaceholder', () => {
  expect(getApiContent() + '\n' + getUtilsContent()).toMatch(/jsonplaceholder/);
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
