/**
 * Nuxt Plugins
 *
 * Tests whether the agent creates plugins in the correct location using
 * defineNuxtPlugin and provides utilities via the Nuxt provide pattern.
 *
 * Tricky because agents might place plugins in wrong directories, forget
 * to use defineNuxtPlugin, or use Vue's provide/inject directly instead
 * of Nuxt's plugin provide pattern (nuxtApp.provide / useNuxtApp()).
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Plugin exists in plugins directory', () => {
  const pluginsDir = findFile(
    join(process.cwd(), 'app', 'plugins'),
    join(process.cwd(), 'plugins'),
  );

  expect(pluginsDir).toBeDefined();

  const files = readdirSync(pluginsDir!);
  const hasPlugin = files.some(f => f.endsWith('.ts'));

  expect(hasPlugin).toBe(true);
});

test('Plugin uses defineNuxtPlugin', () => {
  const pluginsDir = findFile(
    join(process.cwd(), 'app', 'plugins'),
    join(process.cwd(), 'plugins'),
  );

  expect(pluginsDir).toBeDefined();

  const files = readdirSync(pluginsDir!);
  const pluginFile = files.find(f => f.endsWith('.ts'));

  expect(pluginFile).toBeDefined();

  const content = readFileSync(join(pluginsDir!, pluginFile!), 'utf-8');

  expect(content).toMatch(/defineNuxtPlugin/);
});

test('Plugin provides utilities via nuxtApp.provide or return provide', () => {
  const pluginsDir = findFile(
    join(process.cwd(), 'app', 'plugins'),
    join(process.cwd(), 'plugins'),
  );

  expect(pluginsDir).toBeDefined();

  const files = readdirSync(pluginsDir!);
  const pluginFile = files.find(f => f.endsWith('.ts'));

  expect(pluginFile).toBeDefined();

  const content = readFileSync(join(pluginsDir!, pluginFile!), 'utf-8');

  // Should provide via nuxtApp.provide() or return { provide: {} }
  expect(content).toMatch(/provide/);
});

test('Plugin has date formatting functionality', () => {
  const pluginsDir = findFile(
    join(process.cwd(), 'app', 'plugins'),
    join(process.cwd(), 'plugins'),
  );

  expect(pluginsDir).toBeDefined();

  const files = readdirSync(pluginsDir!);
  const pluginFile = files.find(f => f.endsWith('.ts'));

  expect(pluginFile).toBeDefined();

  const content = readFileSync(join(pluginsDir!, pluginFile!), 'utf-8');

  expect(content).toMatch(/date|Date/i);
});

test('Plugin has currency formatting functionality', () => {
  const pluginsDir = findFile(
    join(process.cwd(), 'app', 'plugins'),
    join(process.cwd(), 'plugins'),
  );

  expect(pluginsDir).toBeDefined();

  const files = readdirSync(pluginsDir!);
  const pluginFile = files.find(f => f.endsWith('.ts'));

  expect(pluginFile).toBeDefined();

  const content = readFileSync(join(pluginsDir!, pluginFile!), 'utf-8');

  expect(content).toMatch(/currency|Currency|price|Price/i);
});

test('Homepage uses the plugin via useNuxtApp', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  // Should access plugin via useNuxtApp() with $prefix
  expect(content).toMatch(/useNuxtApp|\$[a-zA-Z]/);
});

test('Homepage displays formatted values', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  // Should have template with data binding
  expect(content).toMatch(/<template>[\s\S]*\{\{[\s\S]*\}\}[\s\S]*<\/template>/);
});
