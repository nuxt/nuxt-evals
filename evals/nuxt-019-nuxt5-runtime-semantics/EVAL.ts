/**
 * Nuxt 5 runtime semantics
 *
 * The app already sets `future: { compatibilityVersion: 5 }`. Re-verified on
 * nuxt@4.6.4 by observing real builds, not just read from the upgrade guide:
 *
 *   - `.client.vue` components SSR as `<!--placeholder-->` instead of an empty
 *     `<div>`, so a placeholder that relied on inherited `class`/`style` to
 *     reserve space no longer does. Observed: the served HTML is
 *     `<h1>Dashboard</h1><!--placeholder--><p>…` with no `min-height`.
 *     Documented fix is `<ClientOnly>` with a `#fallback` slot.
 *   - A Vite plugin registered for one environment (`{ server: false }`) with
 *     a `config` hook. Unlike 4.5.x, on 4.6.4 kit keeps such plugins top-level
 *     and Vite still calls their `config` hook: the build and the dev server
 *     both put `vue-router` in the client `optimizeDeps` (dev:
 *     `.cache/vite/deps/_metadata.json`), and only when the hook pushes it.
 *     The kit docs still say Nuxt 5 will not call `config`/`configResolved`
 *     for a flagged registration and point at `applyToEnvironment()`, so the
 *     prompt frames this half as forward-compat ("it still works today")
 *     rather than as a broken build.
 *
 * The panel half fails silently (nothing throws, the build stays green), so
 * the agent has to know the behavior rather than read an error.
 *
 * Vite half, what is accepted and why:
 *   - `applyToEnvironment` and/or `configEnvironment` must appear: the
 *     documented Nuxt 5 shape. A plain `config` hook with the flag dropped is
 *     not accepted, the docs route environment-specific config away from it.
 *   - A flagged registration (`{ server|client: … }`) is accepted only if the
 *     `optimizeDeps` change lives in `configEnvironment`. Nuxt 5 skips `config`
 *     on flagged plugins, but `configEnvironment` is not on that list, and on
 *     4.6.4 a flagged plugin's `configEnvironment(name)` with a `client` guard
 *     was observed to land `vue-router` in the client env only.
 *
 * Panel half: the element that is in the SSR HTML must carry the sizing
 * itself. Each rejected shape was built on 4.6.4 and reserves nothing:
 *   - empty `#fallback` → `<!--[--><!--]-->`
 *   - `fallback-tag="div"` with the sizing left on the panel → `<div></div>`
 *   - a `<style>` rule for a class that only sits on the panel →
 *     `<!--placeholder-->`
 *   - sizing on `<ClientOnly>` without a tag prop → an inline `<span>`, which
 *     ignores `min-height`
 * Accepted: a sized element (inline style, `:style`, or a class with a height
 * rule in the page's `<style>`) in the `#fallback`/`#placeholder` slot, or a
 * fallback component whose own file sets a height; a block `fallback-tag` /
 * `placeholder-tag` with the sizing on `<ClientOnly>`; or a sized wrapper
 * element around the panel.
 *
 * Deliberately NOT tested (do not re-add without re-checking):
 *   - Case-sensitive routing: active under the flag since 4.6 (`/about` 200,
 *     `/About` 404 on 4.6.4), but the fixture has no page whose casing could
 *     regress, so there is nothing to fix.
 *   - Options API disabled: SSR still renders the component's output, so there
 *     is no server-observable symptom (measured on 4.5.1, not re-measured).
 *   - `process.*` typing and `noUncheckedSideEffectImports`: type-check only,
 *     and the experiment runs `scripts: ['build']`, so neither can surface.
 *   - Non-async `callHook`: unverified, it would need a browser to observe.
 *
 * Assertions follow each section's "Migration Steps", not its "Alternatively"
 * tip: reverting a behavior in config (`clientNodePlaceholder: false`,
 * `viteEnvironmentApi: false`, or dropping the compatibility version) turns
 * Nuxt 5 back off rather than preparing for it, and the prompt rules that out.
 * https://nuxt.com/docs/4.x/getting-started/upgrade#testing-nuxt-5
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';

const root = process.cwd();
const appDir = join(root, 'app');

/**
 * Comment stripper that tracks string state, so `//` inside a URL or `/*`
 * inside a glob never opens a phantom comment. A newline closes an
 * unterminated quote (an apostrophe in template text) so it cannot swallow
 * the rest of the file.
 */
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
    if (c === '\\') { out += c + (next ?? ''); i += 2; continue; }
    if (c === mode || (c === '\n' && mode !== '`')) mode = 'code';
    out += c;
    i++;
  }
  return out;
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

// ---------------------------------------------------------------------------
// template helpers
// ---------------------------------------------------------------------------

interface Tag { name: string; attrs: string; start: number; end: number; selfClosing: boolean }

const OPEN_TAG = /<([A-Za-z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

function openTags(markup: string): Tag[] {
  return [...markup.matchAll(OPEN_TAG)].map(m => ({
    name: m[1]!,
    attrs: m[2]!,
    start: m.index!,
    end: m.index! + m[0].length,
    selfClosing: /\/\s*$/.test(m[2]!)
  }));
}

/** Markup between a tag and its matching close tag. */
function innerOf(markup: string, tag: Tag): string {
  if (tag.selfClosing) return '';
  const re = new RegExp(`<(/?)${tag.name}(?=[\\s/>])((?:[^>"']|"[^"]*"|'[^']*')*)>`, 'g');
  re.lastIndex = tag.end;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup))) {
    if (m[1]) depth--;
    else if (!/\/\s*$/.test(m[2]!)) depth++;
    if (depth === 0) return markup.slice(tag.end, m.index);
  }
  return markup.slice(tag.end);
}

/** A height declaration that actually reserves space (not 0 / auto). */
const SIZING_DECL = /(?:^|[\s;{'"])(?:min-height|height)\s*:(?!\s*(?:0(?![.\d])|auto\b|unset\b|initial\b))\s*[^;}\s]/;
const SIZING_BIND = /(?:\bminHeight|\bheight|['"]min-height['"])\s*:/;

/** Classes whose rule in a `<style>` block of `source` sets a height. */
function sizedClasses(source: string): Set<string> {
  const out = new Set<string>();
  for (const block of source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const rule of block[1]!.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!SIZING_DECL.test(`{${rule[2]}`)) continue;
      for (const cls of rule[1]!.matchAll(/\.([\w-]+)/g)) out.add(cls[1]!);
    }
  }
  return out;
}

function attrsSized(attrs: string, classes: Set<string>): boolean {
  const style = /(?:^|\s)style\s*=\s*"([^"]*)"/.exec(attrs)?.[1];
  if (style !== undefined && SIZING_DECL.test(` ${style}`)) return true;
  const bound = /(?:^|\s)(?::|v-bind:)style\s*=\s*"([^"]*)"/.exec(attrs)?.[1];
  if (bound !== undefined && (SIZING_BIND.test(bound) || SIZING_DECL.test(` ${bound}`))) return true;
  const cls = /(?:^|\s)class\s*=\s*"([^"]*)"/.exec(attrs)?.[1];
  return cls !== undefined && cls.split(/\s+/).some(c => classes.has(c));
}

/** The template part of an SFC, with script and style blocks removed. */
function templateOf(sfc: string): string {
  return sfc
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
}

const PANEL_RE = /<(?:StatsPanel|stats-panel)(?=[\s/>])/;
const isPanel = (name: string) => /^(StatsPanel|stats-panel)$/.test(name);
const isClientOnly = (name: string) => /^(ClientOnly|client-only)$/.test(name);

/** A fallback component (`<StatsSkeleton />`) whose own file sets a height. */
function componentSized(name: string): boolean {
  const pascal = name.replace(/(^|-)(\w)/g, (_, __, ch: string) => ch.toUpperCase());
  const file = sourceFiles(join(appDir, 'components')).find(f =>
    basename(f.path).replace(/(\.client|\.server)?\.vue$/, '') === pascal
  );
  if (!file) return false;
  const classes = sizedClasses(file.content);
  return openTags(templateOf(file.content)).some(t => attrsSized(t.attrs, classes));
}

// ---------------------------------------------------------------------------

test('Nuxt 5 behavior is not switched back off', () => {
  const cfg = config();
  const reverts = [
    ['experimental.clientNodePlaceholder: false', /clientNodePlaceholder\s*:\s*false/],
    ['experimental.viteEnvironmentApi: false', /viteEnvironmentApi\s*:\s*false/]
  ] as const;

  const used = reverts.filter(([, re]) => re.test(cfg)).map(([name]) => name);

  expect(used, `these revert to Nuxt 4 behavior instead of migrating: ${used.join(', ')}`).toEqual([]);
  expect(
    cfg,
    'future.compatibilityVersion 5 must stay: removing it turns every Nuxt 5 default back off'
  ).toMatch(/\bfuture\s*:\s*\{[^}]*\bcompatibilityVersion\s*:\s*(?:[5-9]|\d{2,})\b/);
});

test('Client-only stats panel still reserves its space', () => {
  const page = indexPage();
  const classes = sizedClasses(page);
  const markup = templateOf(page);
  const tags = openTags(markup);

  let reserved = false;
  for (const tag of tags) {
    if (reserved) break;
    const inner = innerOf(markup, tag);
    if (!PANEL_RE.test(inner)) continue;

    if (isClientOnly(tag.name)) {
      // the slot content is what SSR renders, so it must be sized itself
      for (const slot of openTags(inner).filter(t => t.name === 'template' && /(?:#|v-slot:)(?:fallback|placeholder)\b/.test(t.attrs))) {
        const slotTags = openTags(innerOf(inner, slot));
        if (slotTags.some(t => attrsSized(t.attrs, classes) || (/^[A-Z]|-/.test(t.name) && componentSized(t.name)))) {
          reserved = true;
        }
      }
      // without a slot, ClientOnly renders its attrs onto the fallback tag,
      // which defaults to an inline <span> that ignores min-height
      const fallbackTag = /(?:^|\s)(?:fallback-tag|fallbackTag|placeholder-tag|placeholderTag)\s*=\s*"([\w-]+)"/.exec(tag.attrs)?.[1];
      if (fallbackTag && fallbackTag !== 'span' && attrsSized(tag.attrs, classes)) reserved = true;
    } else if (!isPanel(tag.name) && tag.name !== 'template' && attrsSized(tag.attrs, classes)) {
      // a sized wrapper is in the SSR HTML whatever the panel renders
      reserved = true;
    }
  }

  expect(
    reserved,
    'a .client.vue component SSRs as a comment node: the element rendered on the server (a #fallback slot, a block fallback-tag, or a wrapper) must carry the sizing itself'
  ).toBe(true);
});

test('Vite plugin targets its environment the Nuxt 5 way', () => {
  const modules = sourceFiles(join(root, 'modules'));
  expect(modules.length, 'the analytics module is gone').toBeGreaterThan(0);
  const source = modules.map(f => f.content).join('\n');

  expect(source).toMatch(/applyToEnvironment|configEnvironment/);

  // Nuxt 5 does not call `config`/`configResolved` on a plugin registered for a
  // single environment, so a flagged registration has to do its work in
  // `configEnvironment`. `experimental.viteEnvironmentApi` is removed in Nuxt 5,
  // so opting out is not a forward-compatible fix either.
  const flagged = modules
    .filter(f => /addVitePlugin|extendViteConfig/.test(f.content))
    .filter(f => /\{[^{}]*\b(client|server)\s*:\s*(true|false)[^{}]*\}/.test(f.content))
    .map(f => f.path);

  if (flagged.length > 0) {
    const bodies: string[] = [];
    for (const m of source.matchAll(/\bconfigEnvironment\b/g)) {
      const open = source.indexOf('{', m.index! + m[0].length);
      if (open === -1) continue;
      let depth = 0;
      for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}' && --depth === 0) {
          bodies.push(source.slice(open, i + 1));
          break;
        }
      }
    }
    expect(
      bodies.some(b => /optimizeDeps/.test(b)),
      `single-environment registration keeps its \`config\` hook, which Nuxt 5 no longer calls: move the change to configEnvironment or drop the flag for applyToEnvironment: ${flagged.join(', ')}`
    ).toBe(true);
  }
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
