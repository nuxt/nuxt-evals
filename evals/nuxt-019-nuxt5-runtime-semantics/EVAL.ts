/**
 * Nuxt 5 runtime semantics
 *
 * The app already sets `future: { compatibilityVersion: 5 }`. Both behaviors
 * below were verified against nuxt@4.5.1 by observing a real build, not just
 * read from the upgrade guide:
 *
 *   - `.client.vue` components SSR as `<!--placeholder-->` instead of an empty
 *     `<div>`, so a placeholder that relied on inherited `class`/`style` to
 *     reserve space no longer does. Observed: the served HTML contains
 *     `<!--placeholder-->` and no `min-height`. Documented fix is `<ClientOnly>`
 *     with a `#fallback` slot.
 *   - A Vite plugin registered for a single environment (`{ server: false }`)
 *     no longer gets its `config` hook called. Observed: the hook fires without
 *     the flag and does not fire with it. Fix is `applyToEnvironment` /
 *     `configEnvironment`.
 *
 * Both fail silently — nothing throws and the build stays green — so the agent
 * has to know the behavior rather than read an error.
 *
 * Deliberately NOT tested (measured on 4.5.1, do not re-add without re-checking):
 *   - Case-sensitive routing: not active. `/About` still serves `pages/about.vue`
 *     and no `sensitive` option reaches the built router.
 *   - Options API disabled: SSR still renders the component's output, so there
 *     is no server-observable symptom.
 *   - `process.*` typing and `noUncheckedSideEffectImports`: type-check only,
 *     and the experiment runs `scripts: ['build']`, so neither can surface.
 *   - Non-async `callHook`: unverified — would need a browser to observe.
 *
 * Assertions follow each section's "Migration Steps", not its "Alternatively"
 * tip: reverting a behavior in config turns Nuxt 5 back off rather than
 * preparing for it, and the prompt rules that out.
 * https://nuxt.com/docs/4.x/getting-started/upgrade#testing-nuxt-5
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const appDir = join(root, 'app');

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceFiles(dir: string): Array<{ path: string; content: string }> {
  if (!existsSync(dir)) return [];
  const out: Array<{ path: string; content: string }> = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(vue|ts|js|mts)$/.test(entry.name)) {
      out.push({ path: full, content: stripComments(readFileSync(full, 'utf-8')) });
    }
  }
  return out;
}

function config(): string {
  return stripComments(readFileSync(join(root, 'nuxt.config.ts'), 'utf-8'));
}

function indexPage(): string {
  const p = join(appDir, 'pages', 'index.vue');
  if (!existsSync(p)) throw new Error('app/pages/index.vue is gone');
  return stripComments(readFileSync(p, 'utf-8'));
}

test('Nuxt 5 behavior is not switched back off', () => {
  const cfg = config();
  const reverts = [
    ['experimental.clientNodePlaceholder: false', /clientNodePlaceholder\s*:\s*false/],
    ['future.compatibilityVersion below 5', /compatibilityVersion\s*:\s*(?!5)\d/]
  ] as const;

  const used = reverts.filter(([, re]) => re.test(cfg)).map(([name]) => name);

  expect(used, `these revert to Nuxt 4 behavior instead of migrating: ${used.join(', ')}`).toEqual([]);
});

test('Client-only stats panel still reserves its space', () => {
  const page = indexPage();

  const wrappedWithFallback =
    /<ClientOnly/.test(page)
    && /#fallback|v-slot:fallback|fallback-tag|<ClientOnly[^>]*\sfallback\s*=/.test(page);

  // A sized wrapper works too, as long as the sizing is on something other than
  // the client-only component itself — that no longer renders an element to
  // receive it.
  const withoutPanelTag = page.replace(/<StatsPanel[^>]*\/?>/g, '');
  const sizedWrapper = /min-height|height\s*:/.test(withoutPanelTag);

  expect(
    wrappedWithFallback || sizedWrapper,
    'a .client.vue component SSRs as a comment node — reserve the space with a #fallback slot'
  ).toBe(true);
});

test('Vite plugin targets its environment instead of a registration flag', () => {
  const modules = sourceFiles(join(root, 'modules'));
  expect(modules.length, 'the analytics module is gone').toBeGreaterThan(0);

  // `experimental.viteEnvironmentApi` is removed in Nuxt 5, so opting out is not
  // a forward-compatible fix and is deliberately not accepted.
  const legacy = modules
    .filter(f => /addVitePlugin|extendViteConfig/.test(f.content))
    .filter(f => /\{[^{}]*\b(client|server)\s*:\s*(true|false)[^{}]*\}/.test(f.content))
    .map(f => f.path);

  expect(legacy, `single-environment registration no longer runs config hooks: ${legacy.join(', ')}`).toEqual([]);

  const source = modules.map(f => f.content).join('\n');
  expect(source).toMatch(/applyToEnvironment|configEnvironment/);
});

test('Stats panel is still client-only and keeps its numbers', () => {
  const panel = sourceFiles(join(appDir, 'components')).find(f => /StatsPanel/i.test(f.path));
  expect(panel, 'StatsPanel component is gone').toBeDefined();

  const clientOnly = /\.client\.vue$/.test(panel!.path) || /<ClientOnly/.test(indexPage());
  expect(clientOnly, 'the panel must still be client-only').toBe(true);

  expect(panel!.content).toMatch(/1284/);
  expect(panel!.content).toMatch(/37/);
});

test('Vite plugin still pre-bundles the dependency', () => {
  const source = sourceFiles(join(root, 'modules')).map(f => f.content).join('\n');

  expect(source).toMatch(/optimizeDeps/);
  expect(source).toMatch(/vue-router/);
});
