/**
 * Single source of truth via the Nuxt `shared/` directory
 *
 * The starter duplicates the supported-currency list + validator in both
 * app/utils/ and server/utils/, so the two copies can drift. The Nuxt 4 fix is
 * the `shared/` directory: files in shared/utils/ (and shared/types/) are
 * auto-imported in BOTH the Vue app and the Nitro server, so one definition
 * serves both — the page and the /api/convert route keep working unchanged.
 *
 * Wrong-priors (Nuxt-3 muscle memory): leave the duplication; or "consolidate"
 * by importing the server's copy from app/ (a fragile cross-boundary import);
 * or not know shared/ exists. Correct: one definition, living under shared/.
 * https://nuxt.com/docs/guide/directory-structure/shared
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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

const DEF = /(?:export\s+)?const\s+SUPPORTED_CURRENCIES\s*=/;

function appFiles() { return collectFiles(join(process.cwd(), 'app'), ['.ts', '.vue']); }
function serverFiles() { return collectFiles(join(process.cwd(), 'server'), ['.ts']); }
function sharedFiles() { return collectFiles(join(process.cwd(), 'shared'), ['.ts']); }
function read(f: string) { return readFileSync(f, 'utf-8'); }

test('A shared/ utility holds the currency list', () => {
  expect(existsSync(join(process.cwd(), 'shared'))).toBe(true);
  expect(sharedFiles().some(f => DEF.test(read(f)))).toBe(true);
});

test('The currency list is defined exactly once, under shared/', () => {
  const defs = [...appFiles(), ...serverFiles(), ...sharedFiles()].filter(f => DEF.test(read(f)));

  expect(defs.length).toBe(1);
  expect(defs[0]).toMatch(/[/\\]shared[/\\]/);
});

test('The list is no longer duplicated in app/ or server/', () => {
  expect(appFiles().filter(f => DEF.test(read(f))).length).toBe(0);
  expect(serverFiles().filter(f => DEF.test(read(f))).length).toBe(0);
});

test('The page still lists the supported currencies', () => {
  const page = join(process.cwd(), 'app', 'pages', 'index.vue');
  expect(existsSync(page)).toBe(true);
  expect(read(page)).toMatch(/SUPPORTED_CURRENCIES/);
});

test('The API route still validates against the shared list', () => {
  const dir = join(process.cwd(), 'server', 'api');
  const file = readdirSync(dir).find(f => f.startsWith('convert'));
  expect(file).toBeDefined();
  expect(read(join(dir, file!))).toMatch(/isSupportedCurrency|SUPPORTED_CURRENCIES/);
});
