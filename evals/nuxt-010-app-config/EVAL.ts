/**
 * Nuxt App Config
 *
 * Tests whether the agent uses app.config.ts with useAppConfig() for
 * reactive app-level configuration instead of confusing it with runtimeConfig.
 *
 * Tricky because agents confuse app.config.ts (reactive, client-side theming)
 * with runtimeConfig (env vars, server secrets). They also sometimes use
 * defineAppConfig incorrectly or use runtimeConfig for theme settings.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('app.config.ts exists', () => {
  const configPath = findFile(
    join(process.cwd(), 'app', 'app.config.ts'),
    join(process.cwd(), 'app.config.ts'),
  );

  expect(configPath).toBeDefined();
});

test('app.config.ts uses defineAppConfig', () => {
  const configPath = findFile(
    join(process.cwd(), 'app', 'app.config.ts'),
    join(process.cwd(), 'app.config.ts'),
  );

  const content = readFileSync(configPath!, 'utf-8');

  expect(content).toMatch(/defineAppConfig/);
});

test('app.config.ts defines theme configuration', () => {
  const configPath = findFile(
    join(process.cwd(), 'app', 'app.config.ts'),
    join(process.cwd(), 'app.config.ts'),
  );

  const content = readFileSync(configPath!, 'utf-8');

  // Should have theme-related config (color, name, etc.)
  expect(content).toMatch(/color|theme|primary/i);
  expect(content).toMatch(/name|title|siteName/i);
});

test('Theme settings are NOT in runtimeConfig', () => {
  const nuxtConfigPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(nuxtConfigPath, 'utf-8');

  // Theme settings should be in app.config.ts, not runtimeConfig.
  // Only fail if runtimeConfig explicitly exists in the config.
  expect(content).not.toMatch(/runtimeConfig\s*:\s*\{[^}]*(theme|primaryColor|primary\s*:)/i);
});

test('Homepage uses useAppConfig', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  // Should use useAppConfig() (not useRuntimeConfig)
  expect(content).toMatch(/useAppConfig/);
});

test('Homepage does not use useRuntimeConfig for theme', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  const content = readFileSync(pagePath!, 'utf-8');

  // Should NOT use useRuntimeConfig — this page only needs useAppConfig for theme data.
  // Using useRuntimeConfig here indicates confusion between appConfig and runtimeConfig.
  expect(content).not.toMatch(/useRuntimeConfig/);
});

test('Homepage displays config values', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  const content = readFileSync(pagePath!, 'utf-8');

  expect(content).toMatch(/<template>[\s\S]*\{\{[\s\S]*\}\}[\s\S]*<\/template>/);
});
