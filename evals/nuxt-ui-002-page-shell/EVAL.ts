/**
 * Nuxt UI Page Shell (Header + Main + Footer)
 *
 * Tests whether the agent uses Nuxt UI's layout components (UHeader, UMain,
 * UFooter) with UNavigationMenu for building a public website shell.
 *
 * Tricky because agents often build custom navbars with raw HTML elements
 * (<nav>, <header>, <footer>) instead of using Nuxt UI's purpose-built
 * layout components, or they skip UMain and UNavigationMenu entirely.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getAppVueContent(): string {
  const appPath = join(process.cwd(), 'app', 'app.vue');

  if (!existsSync(appPath)) {
    throw new Error('No app.vue found');
  }

  return readFileSync(appPath, 'utf-8');
}

function getLayoutOrAppContent(): string {
  // Check for a default layout first
  const layoutsDir = join(process.cwd(), 'app', 'layouts');
  if (!existsSync(layoutsDir)) {
    return getAppVueContent();
  }

  const files = readdirSync(layoutsDir);
  const defaultLayout = files.find(f => f.startsWith('default'));

  if (defaultLayout) {
    return readFileSync(join(layoutsDir, defaultLayout), 'utf-8');
  }

  // Fall back to app.vue
  return getAppVueContent();
}

function getPageContent(): string | undefined {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
  );

  if (!pagePath) return undefined;

  return readFileSync(pagePath, 'utf-8');
}

test('App shell exists', () => {
  const content = getLayoutOrAppContent();

  expect(content).toBeDefined();
});

test('Uses UHeader component', () => {
  const content = getLayoutOrAppContent();

  expect(content).toMatch(/UHeader/);
});

test('Uses UNavigationMenu for navigation', () => {
  const content = getLayoutOrAppContent();

  // Should use UNavigationMenu with items, not raw links
  expect(content).toMatch(/UNavigationMenu/);
});

test('Navigation has items with labels', () => {
  const content = getLayoutOrAppContent();

  // Navigation items should have label and to properties
  expect(content).toMatch(/label\s*:/);
  expect(content).toMatch(/to\s*:/);
});

test('Uses UMain to wrap page content', () => {
  const content = getLayoutOrAppContent();

  // UMain should wrap NuxtPage or slot
  expect(content).toMatch(/UMain/);
});

test('Uses UFooter component', () => {
  const content = getLayoutOrAppContent();

  expect(content).toMatch(/UFooter/);
});

test('Header has right slot content', () => {
  const content = getLayoutOrAppContent();

  // UHeader should use #right slot for actions (buttons, icons)
  expect(content).toMatch(/#right/);
});

test('Header has body slot for mobile navigation', () => {
  const content = getLayoutOrAppContent();

  // UHeader #body slot is used for mobile menu with vertical UNavigationMenu
  expect(content).toMatch(/#body/);
});

test('Does not use raw HTML for main layout structure', () => {
  const content = getLayoutOrAppContent();

  // Should NOT use custom <header>, <nav>, or <footer> HTML elements
  // when Nuxt UI provides UHeader, UNavigationMenu, and UFooter
  expect(content).not.toMatch(/<header[\s>]/);
  expect(content).not.toMatch(/<nav[\s>]/);
  expect(content).not.toMatch(/<footer[\s>]/);
});

test('Homepage exists', () => {
  const content = getPageContent();

  expect(content).toBeDefined();
});
