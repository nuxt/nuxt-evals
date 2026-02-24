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
import { existsSync, readFileSync } from 'fs';
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

test('Uses useCookie composable', () => {
  const content = getPageContent();

  expect(content).toMatch(/useCookie/);
});

test('Does not use document.cookie', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/document\.cookie/);
});

test('Does not use onMounted for cookie reading', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/onMounted/);
});

test('Does not use manual cookie parsing', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/\.split\s*\(\s*['"][;=]['"]\s*\)/);
});

test('Does not use js-cookie or cookie library', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/import.*cookie/i);
  expect(content).not.toMatch(/require.*cookie/i);
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
  const content = getPageContent();

  expect(content).toMatch(/useCookie[\s\S]*theme/);
});
