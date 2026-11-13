/**
 * Prefer useCookie Over document.cookie
 *
 * Tests whether the agent replaces manual document.cookie parsing with
 * Nuxt's useCookie composable, and renders the theme on the server so the
 * flash of wrong theme is gone.
 *
 * Tricky because document.cookie works on the client but is not available
 * during SSR. useCookie reads the request's Cookie header on the server
 * (verified on nuxt 4.6.4), which removes the need for onMounted and manual
 * parsing. But reading the cookie is only half the fix: the starter applies the
 * theme by toggling a class on document.documentElement, which only happens in
 * the browser, so the first paint still shows the wrong theme.
 *
 * Checks:
 * - useCookie is called with a theme-related key, either a string literal or a
 *   const holding one;
 * - no document.cookie, onMounted, manual split() parsing or cookie library;
 * - the theme reaches the server-rendered HTML, through useHead htmlAttrs or
 *   bodyAttrs, <Html>/<Body>, or a :class binding in a template. Without this, a
 *   client-only classList toggle passes while the flash persists, and a toggle
 *   moved into an immediate watcher crashes SSR with a 500;
 * - the page still renders the theme and a toggle.
 *
 * Cookie logic may live in the page, a composable or a plugin, so the whole
 * app/ source is scanned, with comments stripped.
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

  // useCookie must actually be CALLED with a theme-related key. Mere
  // co-occurrence of the words anywhere in the app is not persistence. The key
  // may be inlined or held in a const (`useCookie<Theme>(COOKIE_NAME, ...)`).
  const key = /['"`][^'"`]*(?:theme|color|mode)[^'"`]*['"`]/i.source;
  const call = /useCookie\s*(?:<[^(]*>)?\s*\(\s*/.source;
  const direct = new RegExp(call + key, 'i');
  const viaConst = new RegExp(`const\\s+(\\w+)\\s*=\\s*${key}[\\s\\S]*${call}\\1\\b`, 'i');
  expect(direct.test(content) || viaConst.test(content)).toBe(true);
});

test('Theme is applied in the server-rendered HTML', () => {
  const content = getSolutionContent();

  // The flash only goes away if the server already renders the theme. Setting
  // the class from client code (classList, onMounted, import.meta.client) does not.
  expect(content).toMatch(/htmlAttrs|bodyAttrs|<Html\b|<Body\b|(?::|v-bind:)class=/);
});
