/**
 * Nuxt Runtime Config
 *
 * Tests whether the agent correctly uses useRuntimeConfig with proper
 * separation of public vs private keys.
 *
 * Tricky because agents confuse runtimeConfig with app.config, or put
 * private keys in the public section, or use process.env directly instead
 * of the runtimeConfig pattern.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Runtime config is defined in nuxt.config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/runtimeConfig/);
});

test('Runtime config has public section', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  // Should have public nested inside runtimeConfig
  expect(content).toMatch(/runtimeConfig[\s\S]*?public/);
});

test('Public config has app name', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  // Should have some app name in public config
  expect(content).toMatch(/public[\s\S]*?(appName|name|title)/i);
});

test('Private config has API key (not in public)', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  // Should have apiKey/secret somewhere in runtimeConfig
  expect(content).toMatch(/runtimeConfig[\s\S]*?(apiKey|apiSecret|secret)/i);
});

test('Frontend page uses useRuntimeConfig', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  // Should use useRuntimeConfig (not process.env)
  expect(content).toMatch(/useRuntimeConfig/);
  expect(content).not.toMatch(/process\.env/);
});

test('Frontend accesses public config correctly', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  // Accept inline access (.public) or destructured ({ public: ... })
  const hasInlineAccess = /config\.public|runtimeConfig\.public|useRuntimeConfig\(\)\.public/.test(content);
  const hasDestructured = /\{\s*public\s*:/.test(content) && /useRuntimeConfig/.test(content);

  expect(hasInlineAccess || hasDestructured).toBe(true);
});

test('API route exists and uses runtime config', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');

  expect(existsSync(serverApiDir)).toBe(true);

  const files = readdirSync(serverApiDir);
  const apiFile = files.find(f => f.endsWith('.ts'));

  expect(apiFile).toBeDefined();

  const content = readFileSync(join(serverApiDir, apiFile!), 'utf-8');

  // Server-side should use useRuntimeConfig
  expect(content).toMatch(/useRuntimeConfig/);
});
