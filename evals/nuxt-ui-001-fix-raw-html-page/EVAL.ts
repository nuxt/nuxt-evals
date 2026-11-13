/**
 * Fix Raw HTML Page with Nuxt UI Components
 *
 * Tests whether the agent replaces raw HTML elements (header, nav, footer,
 * anchor tags, hero and feature sections) with Nuxt UI's purpose-built
 * components: UHeader, UNavigationMenu, UFooter, UPageHero, UPageSection and
 * UButton. Verified on @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * Tricky because the raw HTML works visually, but the agent must recognize
 * that Nuxt UI provides components that are more accessible, consistent and
 * responsive. Keeping a raw <header> with only the links swapped, or plain
 * <section>s with cards, is the common miss.
 *
 * Checks and why:
 * - Each of UHeader, UNavigationMenu, UFooter, UPageHero and UPageSection is
 *   used somewhere under app/ (page, app.vue, layouts or components).
 * - No raw <header>, <nav> or <footer>: UHeader and UFooter render those tags
 *   themselves.
 * - No raw <a href="/..."> for internal links, and the page uses UButton,
 *   NuxtLink or a `links` prop (UPageHero) for its CTAs.
 * - All three features (Fast, Secure, Scalable) are still there.
 *
 * Comments are stripped before matching, so naming a component in a comment
 * while keeping divs does not pass.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function stripComments(source: string): string {
  // Block and line comments only count when they start a line or follow
  // whitespace, so glob strings and URLs survive.
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

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
      else if (entry.name.endsWith('.vue')) results.push(stripComments(readFileSync(full, 'utf-8')));
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
  // Accept explicit UButton/NuxtLink or passing links as prop to UPageHero
  expect(allContent).toMatch(/UButton|NuxtLink|:?links\s*=/);
});

test('Still has features content', () => {
  const allContent = getAllVueFiles().join('\n');
  expect(allContent).toMatch(/Fast/);
  expect(allContent).toMatch(/Secure/);
  expect(allContent).toMatch(/Scalable/);
});
