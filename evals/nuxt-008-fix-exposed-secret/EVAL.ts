/**
 * Fix Exposed Secret
 *
 * Tests whether the agent recognizes that private runtimeConfig keys
 * are not available on the client and moves the API status check to
 * a server route.
 *
 * Tricky because the bug report says "users see undefined" — the agent
 * must understand that private runtimeConfig is server-only, and the fix
 * is to create a server API route, not to move the secret to public config.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return readFileSync(pagePath, 'utf-8');
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Extract the balanced `public: { ... }` block from the config source so the
// secret check is structural, not dependent on key order in the file.
function extractPublicBlock(config: string): string {
  const idx = config.search(/\bpublic\s*:\s*\{/);
  if (idx === -1) return '';

  const start = config.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < config.length; i++) {
    if (config[i] === '{') depth++;
    else if (config[i] === '}') {
      depth--;
      if (depth === 0) return config.slice(start, i + 1);
    }
  }
  return config.slice(start);
}

test('Page does not access private runtimeConfig keys', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/config\.apiSecret|runtimeConfig.*apiSecret/);
});

test('A server API route exists for status check', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');
  expect(existsSync(serverApiDir)).toBe(true);

  const files = readdirSync(serverApiDir);
  const hasStatusRoute = files.some(f => f.endsWith('.ts'));
  expect(hasStatusRoute).toBe(true);
});

test('Server route uses runtimeConfig for the secret', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');
  const files = readdirSync(serverApiDir);
  const apiFile = files.find(f => f.endsWith('.ts'));

  expect(apiFile).toBeDefined();

  const content = readFileSync(join(serverApiDir, apiFile!), 'utf-8');
  expect(content).toMatch(/useRuntimeConfig|runtimeConfig/);
});

test('Page uses useFetch to call the server route', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
});

test('Private key was NOT moved to public config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = stripComments(readFileSync(configPath, 'utf-8'));

  // apiSecret should NOT be inside the public section (structural check —
  // writing `public: {}` before `apiSecret` is a valid private config).
  expect(extractPublicBlock(content)).not.toMatch(/apiSecret/);
});

test('Page still displays app name', () => {
  const content = getPageContent();

  expect(content).toMatch(/appName|App/);
});

test('Page displays API status from server route', () => {
  const content = getPageContent();

  // Should show some status indicator
  expect(content).toMatch(/[Ss]tatus|[Cc]onnect/);
});
