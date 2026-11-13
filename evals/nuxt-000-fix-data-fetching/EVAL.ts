/**
 * Fix Data Fetching Anti-Pattern
 *
 * Tests whether the agent replaces the onMounted + $fetch + manual ref
 * pattern with Nuxt's data fetching composables (useFetch/useAsyncData and
 * their lazy variants), renders the composable's `data`, and keeps the
 * loading and error states. Verified on nuxt 4.6.4.
 *
 * Tricky because agents are comfortable with the Vue pattern of fetching in
 * onMounted, which never runs during SSR, so the server HTML only ever shows
 * the loading state. Moving the fetch to another client-only spot
 * (onBeforeMount, an `import.meta.client` branch, `server: false`) leaves SSR
 * just as broken, so those fail too. All checks run on comment-stripped
 * source: naming useFetch in a comment scores nothing, and a comment that
 * mentions the old onMounted approach is not penalised.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function collectVueFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectVueFiles(full));
    else if (entry.endsWith('.vue')) out.push(full);
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

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('Page uses Nuxt data fetching composable', () => {
  const content = getPageContent();

  // Accept the lazy variants too (useLazyFetch / useLazyAsyncData are valid).
  expect(content).toMatch(/use(?:Lazy)?(?:Fetch|AsyncData)\s*(?:<[^>]*>)?\s*\(/);
  // `server: false` skips the SSR fetch, which is the bug being fixed.
  expect(content).not.toMatch(/server\s*:\s*false/);
});

test('No component fetches data on the client only', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));

  for (const file of files) {
    const content = stripComments(readFileSync(file, 'utf-8'));
    expect(content, `${file} should not fetch on mount`).not.toMatch(/onBeforeMount|onMounted|import\.meta\.client|process\.client/);
  }
});

test('Page does not use manual ref for loading/error/data state', () => {
  const content = getPageContent();

  // Covers typed refs (`ref<T>(`) and shallowRef, not just a bare `ref(`.
  const manualRef = (name: string) =>
    new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*(?:shallowRef|ref)\\s*(?:<[^>]*>)?\\s*\\(`, 'i');
  expect(manualRef('(?:is)?loading').test(content)).toBe(false);
  expect(manualRef('error').test(content)).toBe(false);
  expect(manualRef('data').test(content)).toBe(false);
});

test('Rendered greeting comes from the composable return, not a hardcoded string', () => {
  const content = getPageContent();

  // The composable always exposes the response on `data`; the template must use it.
  expect(content).toMatch(/\bdata\b/);
  // The literal lives in the server route only — copying it into the page is cheating.
  expect(content).not.toMatch(/Hello from the API/);
});

test('Page handles the pending/loading state', () => {
  const content = getPageContent();

  // useFetch/useAsyncData expose `status` (and legacy `pending`) for this.
  expect(content).toMatch(/\b(pending|status)\b/);
});

test('Page handles the error state', () => {
  const content = getPageContent();

  expect(content).toMatch(/\berror\b/);
});

test('Page still fetches from the greeting API', () => {
  const content = getPageContent();

  expect(content).toMatch(/\/api\/greeting/);
});

test('Page displays the greeting message', () => {
  const content = getPageContent();

  expect(content).toMatch(/<template>[\s\S]*message[\s\S]*<\/template>/);
});

test('Server API route is unchanged', () => {
  const apiPath = join(process.cwd(), 'server', 'api', 'greeting.ts');
  expect(existsSync(apiPath)).toBe(true);

  const content = readFileSync(apiPath, 'utf-8');
  expect(content).toMatch(/defineEventHandler/);
  expect(content).toMatch(/Hello from the API/);
});
