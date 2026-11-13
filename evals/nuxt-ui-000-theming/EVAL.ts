/**
 * Nuxt UI Theming & Branding
 *
 * Tests whether the agent configures colors and a global Button override in
 * app.config.ts using the ui.colors / ui.<component>.slots pattern, and styles
 * the page with semantic color utilities instead of raw Tailwind palette
 * colors. Verified on @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * Checks and why:
 * - The config lives in app/app.config.ts. Nuxt 4 resolves app.config from
 *   srcDir (app/), and a root app.config.ts is ignored: its colors never reach
 *   the build output, so it is not accepted.
 * - ui.colors sets primary to 'indigo' and neutral to 'zinc', the values the
 *   prompt asks for.
 * - ui.button customizes a theme slot with rounded-full. The Button theme is
 *   slot based (`slots.base` holds `rounded-md`), so v2 style keys like
 *   `button: { rounded: 'full' }` or an empty `button: {}` do nothing.
 * - The page uses UButton and at least one semantic utility (text-primary,
 *   text-muted, bg-muted...), and no raw palette classes like text-indigo-600
 *   or bg-zinc-100, which the prompt rules out. `primary-*` and `neutral-*`
 *   shades are allowed: Nuxt UI maps them to the configured colors
 *   (`--color-neutral-500: var(--ui-color-neutral-500)`).
 * - Colors are not configured in nuxt.config.ts.
 *
 * Comments are stripped before matching so a commented-out config does not count.
 * Quoted keys ('primary': ...) are accepted.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  // Block and line comments only count when they start a line or follow
  // whitespace, so glob strings and URLs survive.
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function getAppConfigContent(): string | undefined {
  // Nuxt 4 only loads app.config.ts from srcDir (app/).
  const configPath = join(process.cwd(), 'app', 'app.config.ts');

  if (!existsSync(configPath)) return undefined;

  return stripComments(readFileSync(configPath, 'utf-8'));
}

function getNuxtConfigContent(): string {
  const configPath = join(process.cwd(), 'nuxt.config.ts');

  if (!existsSync(configPath)) {
    throw new Error('No nuxt.config.ts found');
  }

  return stripComments(readFileSync(configPath, 'utf-8'));
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) {
    throw new Error('No page found');
  }

  return stripComments(readFileSync(pagePath, 'utf-8'));
}

test('app/app.config.ts exists', () => {
  const content = getAppConfigContent();

  expect(content).toBeDefined();
});

test('Uses defineAppConfig', () => {
  const content = getAppConfigContent()!;

  expect(content).toMatch(/defineAppConfig/);
});

test('Colors configured under ui.colors', () => {
  const content = getAppConfigContent()!;

  // Should have ui: { colors: { ... } } structure
  expect(content).toMatch(/['"]?ui['"]?\s*:\s*\{/);
  expect(content).toMatch(/['"]?colors['"]?\s*:\s*\{/);
});

test('Primary color is indigo', () => {
  const content = getAppConfigContent()!;

  expect(content).toMatch(/['"]?primary['"]?\s*:\s*['"]indigo['"]/);
});

test('Neutral color is zinc', () => {
  const content = getAppConfigContent()!;

  expect(content).toMatch(/['"]?neutral['"]?\s*:\s*['"]zinc['"]/);
});

test('Button is customized globally through a theme slot', () => {
  const content = getAppConfigContent()!;

  // ui.button.slots.<slot> must carry rounded-full
  expect(content).toMatch(/['"]?button['"]?\s*:\s*\{[\s\S]*?['"]?slots['"]?\s*:\s*\{[\s\S]*?rounded-full/);
});

test('Homepage exists and uses Nuxt UI components', () => {
  const content = getPageContent();

  expect(content).toMatch(/<UButton[\s>/]/);
});

test('Uses semantic color utilities', () => {
  const content = getPageContent();

  expect(content).toMatch(/\b(text-primary|bg-primary|text-muted|bg-muted|text-dimmed|text-toned|text-default|bg-default|bg-elevated|bg-accented|text-highlighted|border-default|border-muted)\b/);
});

test('No raw Tailwind palette color classes on the page', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/\b(text|bg|border|ring|outline|divide|from|via|to|fill|stroke|shadow|decoration)-(slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/);
});

test('Color config is NOT in nuxt.config.ts', () => {
  const content = getNuxtConfigContent();

  // Colors belong in app.config.ts, not in nuxt.config.ts
  expect(content).not.toMatch(/colors\s*:\s*\{\s*primary/);
});
