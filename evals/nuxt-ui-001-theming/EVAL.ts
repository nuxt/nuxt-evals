/**
 * Nuxt UI Theming & Branding
 *
 * Tests whether the agent configures colors via app.config.ts using the
 * ui.colors pattern and uses semantic color utilities instead of raw
 * Tailwind palette colors.
 *
 * Tricky because agents often put color config in nuxt.config.ts instead
 * of app.config.ts, use raw Tailwind colors (text-indigo-500) instead of
 * semantic utilities (text-primary), or skip the ui.colors structure entirely.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getAppConfigContent(): string | undefined {
  const configPath = join(process.cwd(), 'app.config.ts');

  if (!existsSync(configPath)) return undefined;

  return readFileSync(configPath, 'utf-8');
}

function getNuxtConfigContent(): string {
  const configPath = join(process.cwd(), 'nuxt.config.ts');

  if (!existsSync(configPath)) {
    throw new Error('No nuxt.config.ts found');
  }

  return readFileSync(configPath, 'utf-8');
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) {
    throw new Error('No page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('app.config.ts exists', () => {
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
  expect(content).toMatch(/ui\s*:\s*\{/);
  expect(content).toMatch(/colors\s*:\s*\{/);
});

test('Primary color is configured', () => {
  const content = getAppConfigContent()!;

  // Should set primary color
  expect(content).toMatch(/primary\s*:\s*['"][a-z]+['"]/);
});

test('Neutral color is configured', () => {
  const content = getAppConfigContent()!;

  // Should set neutral color
  expect(content).toMatch(/neutral\s*:\s*['"][a-z]+['"]/);
});

test('Component customization in app.config.ts', () => {
  const content = getAppConfigContent()!;

  // Should customize at least one component globally (e.g., button)
  expect(content).toMatch(/button\s*:\s*\{/i);
});

test('Homepage exists and uses Nuxt UI components', () => {
  const content = getPageContent();

  // Should use at least one Nuxt UI component
  expect(content).toMatch(/UButton/);
});

test('Uses semantic color utilities', () => {
  const content = getPageContent();

  // Should use semantic utilities like text-primary, bg-muted, text-muted, etc.
  expect(content).toMatch(/text-primary|bg-primary|text-muted|bg-muted|text-default|bg-default|bg-elevated|text-highlighted/);
});

test('Color config is NOT in nuxt.config.ts', () => {
  const content = getNuxtConfigContent();

  // Colors should NOT be configured via runtimeConfig or direct color properties
  // in nuxt.config.ts - they belong in app.config.ts
  expect(content).not.toMatch(/colors\s*:\s*\{\s*primary/);
});
