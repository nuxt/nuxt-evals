/**
 * Nuxt UI Installation
 *
 * Tests whether the agent can properly install and configure Nuxt UI.
 * Agents often miss steps like CSS imports, UApp wrapper, or module config.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('Nuxt UI module is configured', () => {
  const rootDir = process.cwd();

  const configPath = join(rootDir, 'nuxt.config.ts');

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');

    // Should have @nuxt/ui in modules
    expect(content).toMatch(/@nuxt\/ui/);
  }
});

test('CSS file with proper imports exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'assets', 'css', 'main.css'),
    join(rootDir, 'app', 'assets', 'main.css'),
    join(rootDir, 'assets', 'css', 'main.css'),
    join(rootDir, 'assets', 'main.css'),
  ];

  const cssPath = possiblePaths.find((p) => existsSync(p));

  // CSS file should exist
  expect(cssPath).toBeDefined();

  if (cssPath) {
    const content = readFileSync(cssPath, 'utf-8');

    // Should have tailwind imports
    expect(content).toMatch(/@import|@tailwind/);
  }
});

test('App is wrapped with UApp component', () => {
  const rootDir = process.cwd();

  const appVuePath = join(rootDir, 'app', 'app.vue');

  if (existsSync(appVuePath)) {
    const content = readFileSync(appVuePath, 'utf-8');

    // Should use UApp component
    expect(content).toMatch(/UApp/);
  }
});

test('Package.json has @nuxt/ui dependency', () => {
  const rootDir = process.cwd();

  const packagePath = join(rootDir, 'package.json');

  if (existsSync(packagePath)) {
    const content = readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(content);

    const hasNuxtUI =
      pkg.dependencies?.['@nuxt/ui'] || pkg.devDependencies?.['@nuxt/ui'];

    expect(hasNuxtUI).toBeTruthy();
  }
});

test('CSS is configured in nuxt.config', () => {
  const rootDir = process.cwd();

  const configPath = join(rootDir, 'nuxt.config.ts');

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');

    // Should have css configuration
    expect(content).toMatch(/css.*main\.css|css:\s*\[/);
  }
});
