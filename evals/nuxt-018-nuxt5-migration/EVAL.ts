/**
 * Prepare a Nuxt 4 app for Nuxt 5
 *
 * Nuxt 5 is opt-in from Nuxt 4.2+ via `future: { compatibilityVersion: 5 }`.
 * The starter also uses two patterns the modern data-fetching API has moved on
 * from:
 *   - `dedupe: true`  → booleans are not part of the option type any more
 *     (`'cancel' | 'defer'`); at runtime `true` falls through to the default
 *     `'cancel'`, so either `'cancel'` or dropping the option keeps behavior.
 *   - `data.value === null` → `data` defaults to `undefined` (not `null`) since
 *     Nuxt 4, so a `=== null` guard never matches; compare to `undefined`.
 *
 * Opting in has a third, silent consequence. From Nuxt 4.6 the flag also turns
 * off Nitro auto-imports (`experimental.nitroAutoImports` resolves to
 * `compatibilityVersion < 5`), so `server/api/user.get.ts` calling the global
 * `defineEventHandler` builds green and then 500s with `ReferenceError:
 * defineEventHandler is not defined`. The page falls back to its loading label
 * and nothing errors at build time. Observed on a real nuxt@4.6.4 build: with
 * the flag and no import, `/api/user` is a 500 and the page renders
 * `Loading…`; with `import { defineEventHandler } from 'nuxt/server'` (or
 * `'h3'`) it returns the user. The prompt asks to keep the same behavior, and
 * the upgrade guide's "Testing Nuxt 5" list names this change, so the explicit
 * import is required. `experimental.nitroAutoImports: true` is not accepted:
 * it switches the Nuxt 5 behavior back off instead of migrating.
 * `defineHandler` is accepted as well: it is the documented name from 4.7, and
 * on 4.6.4 importing it fails the build, which the build step already grades.
 *
 * Wrong-prior: models on Nuxt 3 knowledge don't set compatibilityVersion, keep
 * the `dedupe` boolean, null-check the data, and leave server code on
 * auto-imports. The prompt names the goal (ready for Nuxt 5, update deprecated
 * data-fetching patterns, keep the same behavior) but not the APIs.
 *
 * Comments are stripped before matching, so a migration note that quotes the
 * old code does not fail, and a commented-out flag does not pass.
 * https://nuxt.com/docs/4.x/getting-started/upgrade#testing-nuxt-5
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/** Comment stripper that tracks string state (`'http://'` is not a comment). */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  let mode: 'code' | 'line' | 'block' | "'" | '"' | '`' = 'code';
  while (i < source.length) {
    const c = source[i]!;
    const next = source[i + 1];
    if (mode === 'code') {
      if (c === '/' && next === '/') { mode = 'line'; i += 2; continue; }
      if (c === '/' && next === '*') { mode = 'block'; i += 2; continue; }
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4);
        i = end === -1 ? source.length : end + 3;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') mode = c;
      out += c;
      i++;
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += c; }
      i++;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && next === '/') { mode = 'code'; i += 2; }
      else i++;
      continue;
    }
    // inside a string; a newline ends an unterminated quote (e.g. an
    // apostrophe in template text) so it cannot swallow the rest of the file
    if (c === '\\') { out += c + (next ?? ''); i += 2; continue; }
    if (c === mode || (c === '\n' && mode !== '`')) mode = 'code';
    out += c;
    i++;
  }
  return out;
}

function getConfig(): string {
  return stripComments(readFileSync(join(process.cwd(), 'nuxt.config.ts'), 'utf-8'));
}

function getPageContent(): string {
  const p = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ].find(existsSync);
  if (!p) throw new Error('No page found');
  return stripComments(readFileSync(p, 'utf-8'));
}

test('Opts into the Nuxt 5 compatibility version', () => {
  // future: { compatibilityVersion: 5 }. The key only works under `future`
  expect(getConfig()).toMatch(/\bfuture\s*:\s*\{[^}]*\bcompatibilityVersion\s*:\s*5\b/);
});

test('Uses the current dedupe value, not the deprecated boolean', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/dedupe\s*:\s*(true|false)\b/);

  // whatever remains must be one of the two documented strings, also when it
  // is routed through a const
  for (const m of content.matchAll(/\bdedupe\s*:\s*([^,\n})]+)/g)) {
    let value = m[1]!.trim().replace(/\s+as\s+.*$/, '');
    if (/^[\w$]+$/.test(value)) {
      const decl = new RegExp(`\\b(?:const|let|var)\\s+${value}\\s*(?::[^=]+)?=\\s*([^\\n;]+)`).exec(content);
      if (decl) value = decl[1]!.trim().replace(/\s+as\s+.*$/, '');
    }
    expect(value, 'dedupe takes \'cancel\' or \'defer\'').toMatch(/^['"`](cancel|defer)['"`]$/);
  }
});

test('Does not guard fetched data with a strict null check (v4/v5 default is undefined)', () => {
  const content = getPageContent();

  // either operand order, and the inverted `!==` form of the same bug
  expect(content).not.toMatch(/[!=]==\s*null\b/);
  expect(content).not.toMatch(/\bnull\s*[!=]==/);
});

test('Still fetches the user', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
  expect(content).toMatch(/\/api\/user/);
});

test('The /api/user handler imports its helper now that Nitro auto-imports are off', () => {
  const dir = join(process.cwd(), 'server', 'api');
  const files = existsSync(dir)
    ? readdirSync(dir).filter(f => /^user(\.get)?\.(ts|js|mts|mjs)$/.test(f))
    : [];
  expect(files.length, 'server/api/user.get.ts is gone').toBeGreaterThan(0);

  for (const f of files) {
    const source = stripComments(readFileSync(join(dir, f), 'utf-8'));
    const imported = new Set<string>();
    for (const m of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](nuxt\/server|h3)['"]/g)) {
      for (const spec of m[1]!.split(',')) {
        const [name, alias] = spec.trim().split(/\s+as\s+/);
        const allowed = m[2] === 'h3'
          ? ['defineEventHandler', 'eventHandler']
          : ['defineEventHandler', 'defineHandler'];
        if (name && allowed.includes(name)) imported.add((alias ?? name).trim());
      }
    }
    const wrapper = /export\s+default\s+([\w$]+)\s*\(/.exec(source)?.[1];
    expect(
      wrapper !== undefined && imported.has(wrapper),
      `${f}: compatibilityVersion 5 turns off Nitro auto-imports, so the handler must import defineEventHandler from 'nuxt/server' (or 'h3'): the global one is undefined at runtime`
    ).toBe(true);
  }
});
