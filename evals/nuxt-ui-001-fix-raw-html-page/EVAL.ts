/**
 * Fix Raw HTML Page with Nuxt UI Components
 *
 * Tests whether the agent replaces raw HTML elements (header, nav, footer,
 * anchor tags) with Nuxt UI components (UHeader, UNavigationMenu, UFooter,
 * UPageHero, UPageSection, UButton).
 *
 * Tricky because the raw HTML works visually, but the agent must recognize
 * that Nuxt UI provides purpose-built components that are more accessible,
 * consistent, and include built-in responsive behavior.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getAllVueFiles(): string[] {
  const results: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.name.endsWith('.vue')) results.push(readFileSync(full, 'utf-8'));
    }
  }

  scan(join(process.cwd(), 'app'));
  return results;
}

function getLayoutOrAppContent(): string {
  const layoutsDir = join(process.cwd(), 'app', 'layouts');
  if (existsSync(layoutsDir)) {
    const files = readdirSync(layoutsDir);
    const defaultLayout = files.find(f => f.startsWith('default'));
    if (defaultLayout) {
      return readFileSync(join(layoutsDir, defaultLayout), 'utf-8');
    }
  }

  const appPath = join(process.cwd(), 'app', 'app.vue');
  if (!existsSync(appPath)) throw new Error('No app.vue found');
  return readFileSync(appPath, 'utf-8');
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
  );

  if (!pagePath) throw new Error('No index page found');
  return readFileSync(pagePath, 'utf-8');
}

test('Uses UHeader component', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/UHeader/);
});

test('Uses UNavigationMenu for nav items', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/UNavigationMenu/);
});

test('Uses UFooter component', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/UFooter/);
});

test('Uses UPageHero for hero section', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/UPageHero/);
});

test('Uses UPageSection for features', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/UPageSection/);
});

test('No raw header element', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).not.toMatch(/<header[\s>]/);
});

test('No raw nav element', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).not.toMatch(/<nav[\s>]/);
});

test('No raw footer element', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).not.toMatch(/<footer[\s>]/);
});

test('No raw anchor tags for internal navigation', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).not.toMatch(/<a[^>]*href=["']\/[^"']*["']/);
});

test('Uses NuxtLink or UButton for CTAs', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/UButton|NuxtLink/);
});

test('Still has features content', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/Fast|Secure|Scalable/);
});
