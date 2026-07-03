/**
 * Fix Watch + $fetch Anti-Pattern
 *
 * Tests whether the agent replaces the manual watch() + $fetch() + onMounted()
 * pattern with useFetch using a genuinely reactive URL — and keeps the loading
 * and error states, now driven by the composable's own status/error.
 *
 * Tricky because the watch + $fetch pattern works functionally but causes
 * flicker on SSR (client-only fetch), shows stale data during navigation,
 * and duplicates loading/error state that useFetch handles automatically.
 * A frozen template-string URL (evaluated once) with `watch: [userId]`
 * refetches the SAME url forever — that broken "fix" must NOT pass. The URL
 * must be a getter, a computed, or a useAsyncData handler.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
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

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return stripComments(readFileSync(pagePath, 'utf-8'));
}

test('Uses useFetch or useAsyncData', () => {
  const content = getPageContent();

  // Accept the lazy variants too (useLazyFetch / useLazyAsyncData are valid).
  expect(content).toMatch(/use(?:Lazy)?(?:Fetch|AsyncData)/);
});

test('URL is genuinely reactive (getter, computed, or asyncData handler)', () => {
  const content = getPageContent();

  // Lazy variants (useLazyFetch/useLazyAsyncData) are accepted everywhere here.
  // A getter URL: useFetch(() => `/api/users/${userId.value}`)
  const hasGetterUrl = /use(?:Lazy)?Fetch\s*(?:<[^>]*>)?\s*\(\s*\(\)\s*=>/.test(content);
  // A computed URL that actually depends on the user id.
  const hasComputedUrl =
    /computed\s*\([\s\S]{0,160}?userId/.test(content) &&
    /use(?:Lazy)?(?:Fetch|AsyncData)/.test(content);
  // useAsyncData with a $fetch handler re-runs via its own reactivity.
  const hasAsyncDataHandler =
    /use(?:Lazy)?AsyncData\s*(?:<[^>]*>)?\s*\(/.test(content) && /\$fetch/.test(content);

  // NOTE: a frozen template string plus `watch: [userId]` is intentionally
  // NOT accepted — it refetches the same URL and is functionally broken.
  expect(hasGetterUrl || hasComputedUrl || hasAsyncDataHandler).toBe(true);
});

test('Does not use manual watch + fetch', () => {
  const content = getPageContent();

  // Also catches named wrappers like watch(userId, () => fetchUser()).
  expect(content).not.toMatch(/watch\s*\([\s\S]*?(?:\$fetch|\bfetch\w*)\s*\(/);
});

test('Does not use onMounted', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/onMounted/);
});

test('Does not use manual loading ref', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/(?:const|let)\s+loading\s*=\s*ref\s*[<(]/);
});

test('Does not use manual error ref', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/(?:const|let)\s+error\s*=\s*ref\s*[<(]/);
});

test('Keeps a loading state driven by the composable (status/pending)', () => {
  const content = getPageContent();

  expect(content).toMatch(/\b(pending|status)\b/);
});

test('Keeps an error state driven by the composable', () => {
  const content = getPageContent();

  expect(content).toMatch(/\berror\b/);
});

test('Still fetches from the users API', () => {
  const content = getPageContent();

  expect(content).toMatch(/\/api\/users/);
});

test('Still has user ID input', () => {
  const content = getPageContent();

  expect(content).toMatch(/v-model/);
  expect(content).toMatch(/<input|<UInput/);
});

test('Still displays user name and email', () => {
  const content = getPageContent();

  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
});

test('Server API route is unchanged', () => {
  const apiPath = join(process.cwd(), 'server', 'api', 'users', '[id].ts');
  expect(existsSync(apiPath)).toBe(true);

  const content = readFileSync(apiPath, 'utf-8');
  expect(content).toMatch(/defineEventHandler/);
});
