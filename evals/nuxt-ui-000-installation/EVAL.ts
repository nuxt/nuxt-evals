/**
 * Nuxt UI Installation
 *
 * Tests whether the agent properly installs and configures Nuxt UI with all
 * required setup steps (module, CSS imports, UApp wrapper).
 *
 * Tricky because agents often miss steps like the CSS imports or UApp wrapper
 * which is required for Toast, Tooltip, and Programmatic Overlays to work.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Nuxt UI module is configured in nuxt.config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/@nuxt\/ui/);
});

test('Package.json has @nuxt/ui dependency', () => {
  const packagePath = join(process.cwd(), 'package.json');
  const content = readFileSync(packagePath, 'utf-8');
  const pkg = JSON.parse(content);

  const hasNuxtUI = pkg.dependencies?.['@nuxt/ui'] || pkg.devDependencies?.['@nuxt/ui'];
  expect(hasNuxtUI).toBeTruthy();
});

test('CSS file exists with required imports', () => {
  const cssPath = findFile(
    join(process.cwd(), 'app', 'assets', 'css', 'main.css'),
    join(process.cwd(), 'app', 'assets', 'main.css'),
    join(process.cwd(), 'assets', 'css', 'main.css'),
    join(process.cwd(), 'assets', 'main.css'),
  );

  expect(cssPath).toBeDefined();

  const content = readFileSync(cssPath!, 'utf-8');

  // Should have tailwindcss import
  expect(content).toMatch(/@import.*tailwindcss|@tailwind/);

  // Should have @nuxt/ui import
  expect(content).toMatch(/@import.*@nuxt\/ui/);
});

test('CSS is configured in nuxt.config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  // Should have css configuration with ~/assets/css/main.css or ~/assets/main.css pattern
  expect(content).toMatch(/css\s*:\s*\[/);
  expect(content).toMatch(/~\/assets\/(css\/)?main\.css|assets\/(css\/)?main\.css/);
});

test('App is wrapped with UApp component', () => {
  const appVuePath = join(process.cwd(), 'app', 'app.vue');
  const content = readFileSync(appVuePath, 'utf-8');

  // UApp is required for Toast, Tooltip, and Programmatic Overlays
  expect(content).toMatch(/<UApp/);
});

test('Nuxt UI is in modules array', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  // Should be in modules array
  expect(content).toMatch(/modules\s*:\s*\[[\s\S]*@nuxt\/ui/);
});
