/**
 * Nuxt Runtime Config
 *
 * Tests whether the agent builds a page and an API route on runtimeConfig with
 * the right public/private split. Verified against nuxt 4.6.4.
 *
 * - nuxt.config declares runtimeConfig with at least one private (top-level)
 *   key and a public block holding the app name. On the client,
 *   useRuntimeConfig() only carries `public` and `app`, so the secret must live
 *   outside `public`.
 * - Nothing secret-looking (secret, token, password, api key) sits in the
 *   public block, because public values are serialized into every page payload.
 * - The page reads the app name through useRuntimeConfig() or `$config` and
 *   renders it in its template.
 * - A route anywhere under server/api calls useRuntimeConfig and reads one of
 *   the private keys. The key name and the file name are free.
 * - No app or server code reads process.env directly. Runtime config is what
 *   NUXT_* environment variables override at runtime.
 *
 * Tricky because agents confuse runtimeConfig with app.config, leak the secret
 * into the public block, or read process.env directly in app/server code.
 * Checks run on comment-stripped source.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
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
  const m = content.match(new RegExp('\\b' + key + '\\s*:\\s*\\{'));
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

/** Keys declared directly inside a `{ ... }` block (not in nested objects or strings). */
function topLevelKeys(block: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  for (let j = 0; j < block.length; j++) {
    const ch = block[j];
    if (ch === '\'' || ch === '"' || ch === '`') {
      const end = block.indexOf(ch, j + 1);
      if (depth === 1) {
        const quoted = /^\s*:/.exec(block.slice(end + 1));
        if (quoted) keys.push(block.slice(j + 1, end));
      }
      j = end === -1 ? block.length : end;
    }
    else if ('{[('.includes(ch)) depth++;
    else if ('}])'.includes(ch)) depth--;
    else if (depth === 1 && /[A-Za-z_$]/.test(ch) && /[{,\s]/.test(block[j - 1])) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(block.slice(j));
      if (m) keys.push(m[1]);
      const word = /^[\w$]+/.exec(block.slice(j));
      j += word![0].length - 1;
    }
  }
  return keys;
}

const SECRET_NAME = /secret|token|password|passwd|credential|private|api[_-]?key/i;

function getConfig(): string {
  return stripComments(readFileSync(join(process.cwd(), 'nuxt.config.ts'), 'utf-8'));
}

function getRuntimeConfigBlock(): string {
  return extractBlock(getConfig(), 'runtimeConfig') ?? '';
}

function getPublicBlock(): string | null {
  return extractBlock(getRuntimeConfigBlock(), 'public');
}

function getPrivateKeys(): string[] {
  return topLevelKeys(getRuntimeConfigBlock()).filter(k => k !== 'public' && k !== 'app');
}

function getPage(): string {
  const p = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );
  expect(p).toBeDefined();
  return stripComments(readFileSync(p!, 'utf-8'));
}

test('Runtime config is defined in nuxt.config', () => {
  expect(getRuntimeConfigBlock()).toMatch(/\{/);
});

test('Public config block exists and exposes the app name', () => {
  const publicBlock = getPublicBlock();

  expect(publicBlock, 'runtimeConfig.public block not found').toBeTruthy();
  expect(publicBlock!).toMatch(/appName|name|title/i);
});

test('Secret stays private (not in the public block)', () => {
  const publicBlock = getPublicBlock();

  // The secret has to exist as a private (top-level) runtimeConfig key...
  expect(getPrivateKeys().length, 'no private runtimeConfig key found').toBeGreaterThan(0);
  // ...and nothing secret-looking may live in the public block (that would expose it to the client).
  expect(publicBlock, 'runtimeConfig.public block not found').toBeTruthy();
  expect(SECRET_NAME.test(publicBlock!), 'secret key leaked into runtimeConfig.public').toBe(false);
});

test('Frontend page uses runtime config (not process.env)', () => {
  const content = getPage();

  // useRuntimeConfig() in script, or the documented `$config` template global.
  expect(content).toMatch(/useRuntimeConfig|\$config\b/);
  expect(content).not.toMatch(/process\.env/);
});

test('Frontend accesses public config correctly', () => {
  const content = getPage();

  const hasInlineAccess = /config\.public|runtimeConfig\.public|useRuntimeConfig\(\)\.public|\$config\.public/.test(content);
  const hasDestructured = /\{\s*public\s*:/.test(content) && /useRuntimeConfig/.test(content);

  expect(hasInlineAccess || hasDestructured).toBe(true);
});

test('Page renders the app name from public config', () => {
  const content = getPage();
  const template = content.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? '';
  const publicKeys = topLevelKeys(getPublicBlock() ?? '');

  // Identifiers that carry a public value: the public keys themselves, `public`,
  // or a local assigned from `.public` / a renamed `public:` destructure.
  const idents = new Set<string>(['public', ...publicKeys]);
  for (const m of content.matchAll(/(?:const|let)\s+(\w+)\s*=\s*[^\n;]*\.public\b/g)) idents.add(m[1]);
  for (const m of content.matchAll(/\{\s*public\s*:\s*(\w+)/g)) idents.add(m[1]);

  const rendered = [...template.matchAll(/\{\{([\s\S]*?)\}\}|v-text="([^"]*)"/g)].map(m => m[1] ?? m[2]);
  const rendersPublic = rendered.some(expr => [...idents].some(id => new RegExp(`\\b${id}\\b`).test(expr)));

  expect(rendersPublic, 'template does not render a public runtime config value').toBe(true);
});

test('API route reads the secret from runtime config', () => {
  const files = collectFiles(join(process.cwd(), 'server', 'api'), ['.ts', '.js', '.mjs']);
  expect(files.length, 'no route found under server/api').toBeGreaterThan(0);

  const privateKeys = getPrivateKeys();
  expect(privateKeys.length, 'no private runtimeConfig key found').toBeGreaterThan(0);

  // Any route, at any depth, that calls useRuntimeConfig and reads a private key.
  const readsSecret = files.some((file) => {
    const content = stripComments(readFileSync(file, 'utf-8'));
    return /useRuntimeConfig/.test(content) && privateKeys.some(k => new RegExp(`\\b${k}\\b`).test(content));
  });

  expect(readsSecret, 'no server/api route reads a private runtimeConfig key').toBe(true);
});

test('No app or server code reads process.env directly', () => {
  const files = [
    ...collectFiles(join(process.cwd(), 'app'), ['.vue', '.ts']),
    ...collectFiles(join(process.cwd(), 'server'), ['.ts']),
  ];

  for (const file of files) {
    const content = stripComments(readFileSync(file, 'utf-8'));
    expect(content, `${file} reads process.env directly`).not.toMatch(/process\.env/);
  }
});
