/**
 * Nuxt Runtime Config
 *
 * Tests whether the agent correctly uses useRuntimeConfig with proper
 * separation of public vs private keys: the app name belongs in the public
 * block, the secret must stay private (top-level runtimeConfig), and runtime
 * code must read from useRuntimeConfig rather than process.env.
 *
 * Tricky because agents confuse runtimeConfig with app.config, leak the secret
 * into the public block, or read process.env directly in app/server code.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function collectFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full, exts));
    else if (exts.some(e => entry.endsWith(e))) out.push(full);
  }
  return out;
}

/** Extract the balanced `{ ... }` block that follows `key:`. */
function extractBlock(content: string, key: string): string | null {
  const m = content.match(new RegExp(key + '\\s*:\\s*\\{'));
  if (!m || m.index === undefined) return null;
  const start = content.indexOf('{', m.index);
  let depth = 0;
  for (let j = start; j < content.length; j++) {
    if (content[j] === '{') depth++;
    else if (content[j] === '}') {
      depth--;
      if (depth === 0) return content.slice(start, j + 1);
    }
  }
  return null;
}

const SECRET = /api(?:Key|Secret)|secret/i;

function getConfig(): string {
  return readFileSync(join(process.cwd(), 'nuxt.config.ts'), 'utf-8');
}

function getPagePath(): string {
  const p = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );
  expect(p).toBeDefined();
  return p!;
}

test('Runtime config is defined in nuxt.config', () => {
  expect(getConfig()).toMatch(/runtimeConfig/);
});

test('Public config block exists and exposes the app name', () => {
  const publicBlock = extractBlock(getConfig(), 'public');

  expect(publicBlock, 'runtimeConfig.public block not found').toBeTruthy();
  expect(publicBlock!).toMatch(/appName|name|title/i);
});

test('Secret stays private (not in the public block)', () => {
  const config = getConfig();
  const publicBlock = extractBlock(config, 'public');

  // The secret has to exist in runtimeConfig...
  expect(config).toMatch(SECRET);
  // ...but it must NOT live inside the public block (that would expose it to the client).
  expect(publicBlock, 'runtimeConfig.public block not found').toBeTruthy();
  expect(SECRET.test(publicBlock!), 'secret key leaked into runtimeConfig.public').toBe(false);
});

test('Frontend page uses useRuntimeConfig (not process.env)', () => {
  const content = readFileSync(getPagePath(), 'utf-8');

  expect(content).toMatch(/useRuntimeConfig/);
  expect(content).not.toMatch(/process\.env/);
});

test('Frontend accesses public config correctly', () => {
  const content = readFileSync(getPagePath(), 'utf-8');

  const hasInlineAccess = /config\.public|runtimeConfig\.public|useRuntimeConfig\(\)\.public/.test(content);
  const hasDestructured = /\{\s*public\s*:/.test(content) && /useRuntimeConfig/.test(content);

  expect(hasInlineAccess || hasDestructured).toBe(true);
});

test('API route reads the secret from runtime config', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');

  expect(existsSync(serverApiDir)).toBe(true);

  const files = readdirSync(serverApiDir);
  const apiFile = files.find(f => f.endsWith('.ts'));
  expect(apiFile).toBeDefined();

  const content = readFileSync(join(serverApiDir, apiFile!), 'utf-8');

  expect(content).toMatch(/useRuntimeConfig/);
  expect(content).toMatch(SECRET);
});

test('No app or server code reads process.env directly', () => {
  const files = [
    ...collectFiles(join(process.cwd(), 'app'), ['.vue', '.ts']),
    ...collectFiles(join(process.cwd(), 'server'), ['.ts']),
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    expect(content, `${file} reads process.env directly`).not.toMatch(/process\.env/);
  }
});
