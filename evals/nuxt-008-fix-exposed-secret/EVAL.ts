/**
 * Fix Exposed Secret
 *
 * Tests whether the agent recognizes that private runtimeConfig keys are not
 * available on the client and moves the API status check to a server route.
 * Verified against nuxt 4.6.4: the client's runtime config only carries
 * `public` and `app`, so the starter renders 'Connected' on the server and
 * hydration rewrites it to 'Not connected', which is the symptom in the prompt.
 *
 * - The page never mentions `apiSecret`, in any form (property access,
 *   destructuring, bracket access, or inside a useAsyncData handler that would
 *   run on the client during navigation).
 * - The page calls a server route under /api/ with useFetch, useAsyncData or
 *   their lazy variants.
 * - A route anywhere under server/api reads runtimeConfig, and no route sends
 *   the whole config or the secret itself back to the browser.
 * - apiSecret is not moved into runtimeConfig.public.
 *
 * Tricky because the fix is to create a server API route, not to move the
 * secret to public config. Checks run on comment-stripped source, so comments
 * explaining that apiSecret is server-only are fine.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
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

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return stripComments(readFileSync(pagePath, 'utf-8'));
}

function getRoutes(): { file: string, content: string }[] {
  return collectFiles(join(process.cwd(), 'server', 'api'), ['.ts', '.js', '.mjs'])
    .map(file => ({ file, content: stripComments(readFileSync(file, 'utf-8')) }));
}

/**
 * Whether a route returns the runtime config object or the secret value
 * itself: `return config`, `return useRuntimeConfig(event)`, `return apiSecret`,
 * `{ apiSecret }` or `{ key: apiSecret }` in a returned object.
 */
function returnsSecret(route: string): boolean {
  const returned = [
    // A bare identifier only counts when the expression ends there, so
    // `return apiSecret ? a : b` is a check on the secret, not a leak.
    ...route.matchAll(/\breturn\s+(\{[^}]*\}?|[\w$.]+(?:\([^)]*\))?(?=\s*(?:;|\n|\}|$)))/g),
    ...route.matchAll(/=>\s*\(\s*(\{[^}]*\}?)/g),
    ...route.matchAll(/=>\s*((?:useRuntimeConfig\s*\([^)]*\)|[\w$.]*apiSecret))\s*[,)]/g),
  ].map(m => m[1].trim());

  return returned.some(r =>
    /^(?:useRuntimeConfig\s*\([^)]*\)|\w*[cC]onfig)$/.test(r)
    || /^(?:[\w$.]*\.)?apiSecret$/.test(r)
    || /(?:[{,]|:)\s*(?:[\w$.]*\.)?apiSecret\s*(?:[,}]|$)/.test(r),
  );
}

// Extract the balanced `public: { ... }` block from the config source so the
// secret check is structural, not dependent on key order in the file.
function extractPublicBlock(config: string): string {
  const idx = config.search(/\bpublic\s*:\s*\{/);
  if (idx === -1) return '';

  const start = config.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < config.length; i++) {
    if (config[i] === '{') depth++;
    else if (config[i] === '}') {
      depth--;
      if (depth === 0) return config.slice(start, i + 1);
    }
  }
  return config.slice(start);
}

test('Page does not access private runtimeConfig keys', () => {
  const content = getPageContent();

  // Any mention of the private key on the page is a client-side read
  // (config.apiSecret, destructuring, config['apiSecret'], handlers...).
  expect(content).not.toMatch(/\bapiSecret\b/);
});

test('A server API route exists for status check', () => {
  expect(getRoutes().length, 'no route found under server/api').toBeGreaterThan(0);
});

test('Server route uses runtimeConfig for the secret', () => {
  const routes = getRoutes();

  expect(routes.some(r => /useRuntimeConfig|runtimeConfig/.test(r.content))).toBe(true);
});

test('Server route does not send the secret to the client', () => {
  for (const { file, content } of getRoutes()) {
    expect(returnsSecret(content), `${file} returns the runtime config or the secret`).toBe(false);
  }
});

test('Page uses useFetch to call the server route', () => {
  const content = getPageContent();

  expect(content).toMatch(/use(?:Lazy)?(?:Fetch|AsyncData)/);
  expect(content).toMatch(/['"`]\/api\//);
});

test('Private key was NOT moved to public config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = stripComments(readFileSync(configPath, 'utf-8'));

  // apiSecret should NOT be inside the public section. The check is structural,
  // so writing `public: {}` before `apiSecret` is still a valid private config.
  expect(extractPublicBlock(content)).not.toMatch(/apiSecret/);
});

test('Page still displays app name', () => {
  const content = getPageContent();

  expect(content).toMatch(/appName|App/);
});

test('Page displays API status from server route', () => {
  const content = getPageContent();

  // Should show some status indicator
  expect(content).toMatch(/[Ss]tatus|[Cc]onnect/);
});
