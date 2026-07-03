/**
 * Prefer useCookie Over document.cookie
 *
 * Tests whether the agent replaces manual document.cookie parsing with
 * Nuxt's useCookie composable for SSR-compatible cookie handling.
 *
 * Tricky because document.cookie works on the client but is not available
 * during SSR, causing a flash of wrong theme on page load. The agent must
 * know that useCookie is SSR-safe, reactive, and handles serialization
 * automatically — eliminating the need for onMounted and manual parsing.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'settings.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return readFileSync(pagePath, 'utf-8');
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Cookie logic may live in the page or be extracted into a composable/plugin
// (e.g. useTheme), which is good practice — so scan the whole app/ source.
function getSolutionContent(): string {
  const results: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.(vue|ts|js|mjs)$/.test(entry.name)) {
        results.push(stripComments(readFileSync(full, 'utf-8')));
      }
    }
  }

  scan(join(process.cwd(), 'app'));
  return results.join('\n');
}

test('Uses useCookie composable', () => {
  const content = getSolutionContent();

  expect(content).toMatch(/useCookie/);
});

test('Does not use document.cookie', () => {
  const content = getSolutionContent();

  expect(content).not.toMatch(/document\.cookie/);
});

test('Does not use onMounted for cookie reading', () => {
  const content = getSolutionContent();

  expect(content).not.toMatch(/onMounted/);
});

test('Does not use manual cookie parsing', () => {
  const content = getSolutionContent();

  expect(content).not.toMatch(/\.split\s*\(\s*['"][;=]['"]\s*\)/);
});

test('Does not use js-cookie or cookie library', () => {
  const content = getSolutionContent();

  // Ban third-party cookie packages by name — an explicit import of Nuxt's
  // own useCookie (e.g. from '#app') is the required API, not a library.
  const cookieLib = /['"](?:js-cookie|cookie|cookie-universal(?:-nuxt)?|universal-cookie|@?vueuse\/integrations\/useCookies)['"]/;
  expect(content).not.toMatch(new RegExp(`from\\s*${cookieLib.source}`));
  expect(content).not.toMatch(new RegExp(`require\\s*\\(\\s*${cookieLib.source}`));
});

test('Still has theme toggle functionality', () => {
  const content = getPageContent();

  expect(content).toMatch(/toggle|switch|change/i);
  expect(content).toMatch(/light|dark/i);
});

test('Theme value is reactive', () => {
  const content = getPageContent();

  expect(content).toMatch(/theme/);
  expect(content).toMatch(/<template>[\s\S]*theme[\s\S]*<\/template>/);
});

test('Cookie persists the theme preference', () => {
  const content = getSolutionContent();

  // useCookie must actually be CALLED with a theme-related key — mere
  // co-occurrence of the words anywhere in the app is not persistence.
  expect(content).toMatch(
    /useCookie\s*(?:<[^>]*>)?\s*\(\s*['"`][^'"`]*(?:theme|color|mode)[^'"`]*['"`]/i,
  );
});
