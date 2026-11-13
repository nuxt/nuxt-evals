/**
 * Single source of truth via the Nuxt `shared/` directory
 *
 * The starter duplicates the supported-currency list and validator in both
 * app/utils/ and server/utils/, so the two copies can drift. The Nuxt 4 fix is
 * the `shared/` directory. Files directly in shared/utils/ and shared/types/
 * are auto-imported in both the Vue app and the Nitro server (verified on nuxt
 * 4.6.4), so one definition serves both, and the page and the /api/convert
 * route keep working unchanged. Other files under shared/ are not
 * auto-imported and need an explicit `#shared/...` import.
 *
 * Wrong priors (Nuxt 3 muscle memory): leave the duplication, "consolidate"
 * by importing the server's copy from app/ (a fragile cross-boundary import),
 * or not know shared/ exists.
 *
 * Checks:
 * - the list and the validator are each defined exactly once, under shared/
 *   (a type annotation on the const is fine). Moving only the list while the
 *   server keeps its own validator with a hardcoded array still drifts;
 * - both sides can resolve that definition: it sits in shared/utils/ or
 *   shared/types/, or the page and the route import it from shared/. A file at
 *   shared/currency.ts with no imports builds, then the page and the route fail
 *   with "... is not defined";
 * - the page and the route still use the list and the validator.
 * https://nuxt.com/docs/4.x/directory-structure/shared
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

// `const SUPPORTED_CURRENCIES = ...`, optionally typed, and `let`/`var` so a
// renamed declaration keyword cannot hide a leftover copy.
const DEF = /(?:export\s+)?(?:const|let|var)\s+SUPPORTED_CURRENCIES\b\s*(?::[^=]+)?=/;
const VALIDATOR = /(?:function\s+isSupportedCurrency\b|(?:const|let|var)\s+isSupportedCurrency\b\s*(?::[^=]+)?=)/;

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

test('The validator is defined exactly once, under shared/', () => {
  const defs = [...appFiles(), ...serverFiles(), ...sharedFiles()].filter(f => VALIDATOR.test(read(f)));

  expect(defs.length).toBe(1);
  expect(defs[0]).toMatch(/[/\\]shared[/\\]/);
});

test('Both sides can actually resolve the shared definition', () => {
  const def = sharedFiles().find(f => DEF.test(read(f)));
  expect(def).toBeDefined();

  // Only top-level files in shared/utils/ and shared/types/ are auto-imported.
  const autoImported = /[/\\]shared[/\\](?:utils|types)[/\\][^/\\]+$/.test(def!);
  const page = read(join(process.cwd(), 'app', 'pages', 'index.vue'));
  const dir = join(process.cwd(), 'server', 'api');
  const route = read(join(dir, readdirSync(dir).find(f => f.startsWith('convert'))!));
  const importsShared = (src: string) => /from\s*['"](?:#shared|[./]+\/shared)\//.test(src);

  expect(autoImported || (importsShared(page) && importsShared(route))).toBe(true);
});
