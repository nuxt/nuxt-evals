/**
 * Fix Data Fetching Anti-Pattern
 *
 * Tests whether the agent replaces the onMounted + $fetch + manual ref
 * pattern with Nuxt's built-in data fetching composables (useFetch/useAsyncData)
 * AND wires the rendered output to the composable's reactive return, including
 * loading and error states.
 *
 * Tricky because agents are comfortable with the Vue pattern of fetching
 * in onMounted, but this breaks SSR and causes hydration mismatches in Nuxt.
 * It is no longer enough to merely mention useFetch: the fetched value must be
 * what the template renders, and the anti-pattern must be gone everywhere.
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
  return readFileSync(pagePath, 'utf-8');
}

test('Page uses Nuxt data fetching composable', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
});

test('No component fetches data in onMounted', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    expect(content, `${file} should not use onMounted`).not.toMatch(/onMounted/);
  }
});

test('Page does not use manual ref for loading/error/data state', () => {
  const content = getPageContent();

  expect(/(?:const|let)\s+(?:is)?loading\s*=\s*ref\s*\(/i.test(content)).toBe(false);
  expect(/(?:const|let)\s+error\s*=\s*ref\s*\(/i.test(content)).toBe(false);
  expect(/(?:const|let)\s+data\s*=\s*ref\s*\(/i.test(content)).toBe(false);
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
