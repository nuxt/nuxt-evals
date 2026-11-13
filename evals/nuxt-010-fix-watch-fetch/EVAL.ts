/**
 * Fix Watch + $fetch Anti-Pattern
 *
 * Tests whether the agent replaces the manual watch() + $fetch() + onMounted()
 * pattern with a data-fetching composable that genuinely refetches when the
 * user ID changes, and keeps the loading and error states, now driven by the
 * composable's own status/error. Verified against nuxt 4.6.4:
 *
 * - useFetch turns its URL into `computed(() => toValue(url))` and keys on it,
 *   so a getter URL, a computed URL, or a named getter passed in refetches.
 *   A template string is evaluated once, so `useFetch(`/api/users/${id}`,
 *   { watch: [userId] })` refetches the SAME url forever and must not pass.
 *   A string `key` option replaces the URL-derived key and the URL is not
 *   watched, so a getter URL with `key: 'user'` never refetches either.
 * - useAsyncData only re-runs when its key is reactive (a getter or computed
 *   key) or when its `watch` option fires. Reads of userId inside the handler
 *   are not tracked, so a static or auto-generated key without `watch` never
 *   refetches and must not pass.
 * - `server: false` makes the fetch client-only, which brings back the SSR
 *   flicker the prompt is about, so it fails.
 *
 * Tricky because the watch + $fetch pattern works functionally but causes
 * flicker on SSR (client-only fetch), shows stale data during navigation, and
 * duplicates loading/error state that useFetch handles automatically.
 * Checks run on comment-stripped source.
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

/** Names bound to a getter or computed that depends on userId: `const url = () => ...` / `computed(...)`. */
function reactiveNames(content: string): string[] {
  return [...content.matchAll(
    /(?:const|let)\s+(\w+)\s*=\s*(?:computed\s*(?:<[^>]*>)?\s*\(\s*)?\(\)\s*=>[\s\S]{0,160}?\buserId\b/g,
  )].map(m => m[1]);
}

function hasReactiveFetch(content: string): boolean {
  const names = reactiveNames(content);

  // useFetch(() => `/api/users/${userId.value}`), lazy variants and generics included.
  const getterUrl = /use(?:Lazy)?Fetch\s*(?:<[^>]*>)?\s*\(\s*\(\)\s*=>/.test(content);
  // useFetch(url) where url is a computed or getter that depends on userId.
  const namedUrl = names.some(n => new RegExp(`use(?:Lazy)?Fetch\\s*(?:<[^>]*>)?\\s*\\(\\s*${n}\\b`).test(content));

  // useAsyncData(() => `user-${userId.value}`, ...) or useAsyncData(computed(...), ...):
  // a getter key returns a string, unlike a handler passed first with an auto key.
  const reactiveKey =
    /use(?:Lazy)?AsyncData\s*(?:<[^>]*>)?\s*\(\s*(?:\(\)\s*=>\s*['"`]|computed\s*\()/.test(content)
    || names.some(n => new RegExp(`use(?:Lazy)?AsyncData\\s*(?:<[^>]*>)?\\s*\\(\\s*${n}\\s*,`).test(content));
  // useAsyncData('user', handler, { watch: [userId] }) re-runs through its watch option.
  const watchedAsyncData =
    /use(?:Lazy)?AsyncData\s*(?:<[^>]*>)?\s*\(/.test(content) && /watch\s*:\s*\[[^\]]*\buserId\b/.test(content);

  // useFetch with a string `key` option keys on that string instead of the URL,
  // and the URL itself is not watched, so it never refetches unless userId is
  // in its `watch` option.
  const watchesUserId = /watch\s*:\s*\[[^\]]*\buserId\b/.test(content);
  const staticFetchKey = /\bkey\s*:\s*['"`]/.test(content) && !watchesUserId;

  return ((getterUrl || namedUrl) && !staticFetchKey) || reactiveKey || watchedAsyncData;
}

test('Uses useFetch or useAsyncData', () => {
  const content = getPageContent();

  // Accept the lazy variants too (useLazyFetch / useLazyAsyncData are valid).
  expect(content).toMatch(/use(?:Lazy)?(?:Fetch|AsyncData)/);
});

test('Refetches when the user ID changes (reactive URL or key)', () => {
  const content = getPageContent();

  // NOTE: a frozen template string plus `watch: [userId]`, or useAsyncData with
  // a static key and no watch, are intentionally NOT accepted: neither fetches
  // the new user.
  expect(hasReactiveFetch(content)).toBe(true);
});

test('Fetches during SSR (no server: false)', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/\bserver\s*:\s*false\b/);
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
