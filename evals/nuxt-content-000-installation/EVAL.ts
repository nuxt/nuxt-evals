/**
 * Nuxt Content Installation
 *
 * Tests whether the agent properly installs and configures @nuxt/content with all
 * required setup steps: module registration, content.config.ts, content files,
 * and proper querying/rendering.
 *
 * Tricky because agents often skip the content.config.ts file, use the old v2
 * queryContent API instead of v3 queryCollection, or forget ContentRenderer.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Package.json has @nuxt/content dependency', () => {
  const packagePath = join(process.cwd(), 'package.json');
  const content = readFileSync(packagePath, 'utf-8');
  const pkg = JSON.parse(content);

  const hasContent = pkg.dependencies?.['@nuxt/content'] || pkg.devDependencies?.['@nuxt/content'];
  expect(hasContent).toBeTruthy();
});

test('Nuxt Content module is configured in nuxt.config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/@nuxt\/content/);
  expect(content).toMatch(/modules\s*:\s*\[[\s\S]*@nuxt\/content/);
});

test('Content config file exists with collection definition', () => {
  const configPath = join(process.cwd(), 'content.config.ts');
  expect(existsSync(configPath)).toBe(true);

  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/defineContentConfig/);
  expect(content).toMatch(/defineCollection/);
  expect(content).toMatch(/type\s*:\s*['"]page['"]/);
});

test('Markdown content file exists', () => {
  const contentDir = join(process.cwd(), 'content');
  expect(existsSync(contentDir)).toBe(true);

  const indexFile = findFile(
    join(contentDir, 'index.md'),
    join(contentDir, 'index.markdown'),
  );

  expect(indexFile).toBeDefined();
});

test('Page uses queryCollection (not old v2 queryContent)', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', '[...slug].vue'),
    join(process.cwd(), 'pages', '[...slug].vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  expect(content).toMatch(/queryCollection/);
  // Should NOT use old v2 API
  expect(content).not.toMatch(/queryContent/);
});

test('Page uses ContentRenderer to display content', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', '[...slug].vue'),
    join(process.cwd(), 'pages', '[...slug].vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  expect(content).toMatch(/<ContentRenderer/);
});
