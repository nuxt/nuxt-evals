/**
 * Fix Sequential Fetching
 *
 * Tests whether the agent parallelizes two data fetches that the starter
 * awaits sequentially (each await blocks the next). Verified against nuxt
 * 4.6.4 with two 1s routes: the starter renders in about 2s, Promise.all over
 * useFetch or two non-awaited useFetch calls in about 1s.
 *
 * Accepted: Promise.all over useFetch/useAsyncData, the canonical
 * useAsyncData(() => Promise.all([$fetch, $fetch])), or starting both
 * useFetch/useAsyncData calls before awaiting either (or not awaiting them).
 *
 * Rejected:
 * - Any fetch that starts after an awaited fetch. That includes awaiting the
 *   first useFetch and leaving only the second un-awaited, which is still
 *   sequential (measured at about 2s).
 * - Two awaited $fetch calls, at top level or inside one useAsyncData handler.
 * - $fetch in setup without useAsyncData, even inside Promise.all. It runs
 *   again on the client after hydration, so every request is made twice.
 *
 * Checks run on the comment-stripped <script>, so a comment that mentions
 * Promise.all does not count.
 * https://nuxt.com/docs/4.x/getting-started/data-fetching#useasyncdata
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
  return readFileSync(pagePath, 'utf-8');
}

function getScript(): string {
  const content = getPageContent();
  const script = content.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? content;
  return stripComments(script);
}

const FETCH_CALL = /(?:\$fetch|use(?:Lazy)?(?:Fetch|AsyncData))\s*(?:<[^>]*>)?\s*\(/g;
const AWAITED_FETCH = /await\s+(?:\$fetch|use(?:Lazy)?(?:Fetch|AsyncData))\s*(?:<[^>]*>)?\s*\(/;

/** Index just past the `)` that closes the call whose `(` is at `open`. */
function callEnd(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')' && --depth === 0) return i + 1;
  }
  return source.length;
}

test('Still uses a Nuxt data-fetching primitive', () => {
  const content = getScript();

  // The fix should stay within Nuxt data fetching, not drop to raw fetch in onMounted
  expect(content).toMatch(/useFetch|useAsyncData|useLazyFetch|useLazyAsyncData|\$fetch/);
});

test('Parallelizes the two requests', () => {
  const script = getScript();
  const awaited = AWAITED_FETCH.exec(script);

  // Nothing awaited directly: either `await Promise.all([...])`, or both
  // calls started before (or without) awaiting them.
  if (!awaited) return;

  const end = callEnd(script, awaited.index + awaited[0].length - 1);
  const call = script.slice(awaited.index, end);

  // Inside one awaited call (a useAsyncData handler), two awaited $fetch run in sequence.
  expect((call.match(/await\s+\$fetch/g) ?? []).length, 'two $fetch awaited one after another').toBeLessThan(2);
  // No other request may start after an awaited one: it would wait for it.
  expect(
    (script.slice(end).match(FETCH_CALL) ?? []).length,
    'a request starts after an awaited request',
  ).toBe(0);
});

test('Does not call $fetch directly in setup', () => {
  const script = getScript();

  // Bare $fetch in <script setup> runs on the server and again on the client
  // after hydration. It is only SSR-safe inside a useAsyncData handler.
  if (/\$fetch\s*(?:<[^>]*>)?\s*\(/.test(script)) {
    expect(script).toMatch(/use(?:Lazy)?AsyncData/);
  }
});

test('Still fetches user data from jsonplaceholder', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com\/users/);
});

test('Still fetches posts data', () => {
  const content = getPageContent();

  // Accept a literal id, a template variable (e.g. users/${userId}/posts),
  // or the generic /posts endpoint
  expect(content).toMatch(
    /jsonplaceholder\.typicode\.com\/users\/[^/'"`]+\/posts|jsonplaceholder\.typicode\.com\/posts/
  );
});

test('Still displays user name and email', () => {
  const content = getPageContent();

  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
});

test('Still displays post titles in a list', () => {
  const content = getPageContent();

  expect(content).toMatch(/v-for/);
  expect(content).toMatch(/title/i);
});
