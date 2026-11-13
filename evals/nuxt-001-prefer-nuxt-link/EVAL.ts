/**
 * Prefer NuxtLink Over Anchor Tags
 *
 * Tests whether the agent replaces raw <a href> tags with <NuxtLink to> for
 * internal navigation to enable client-side routing, while the external link
 * keeps pointing at the external site. Verified on nuxt 4.6.4.
 *
 * Tricky because <a href> works functionally but causes full page reloads
 * instead of client-side navigation. Every internal link must be converted,
 * and an internal NuxtLink marked `external` fails because it renders a plain
 * <a> that skips the router. The external link may stay an <a href> or become
 * <NuxtLink to="https://...">: NuxtLink detects absolute URLs and renders a
 * normal anchor with rel="noopener noreferrer", as the NuxtLink docs show.
 * The `to` prop is required on NuxtLink even though `href` is a documented
 * alias. Checks run on comment-stripped source, and accept the kebab-case
 * <nuxt-link> and `:to` route objects ({ path } or { name }).
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function collectVueFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectVueFiles(full));
    else if (entry.endsWith('.vue')) out.push(full);
  }
  return out;
}

// Also catches the bound form <a :href="'/about'">.
const INTERNAL_ANCHOR = /<a\b[^>]*\bhref=["']'?\/(?!\/)/;
const LINK = /<(?:NuxtLink|nuxt-link)\b/;
// An internal NuxtLink marked `external` renders a plain <a> and reloads the page.
const EXTERNAL_INTERNAL_LINK = /<(?:NuxtLink|nuxt-link)\b(?=[^>]*\bto=["']'?\/)[^>]*\sexternal\b/;

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function read(path: string): string {
  return stripComments(readFileSync(path, 'utf-8'));
}

function linksTo(content: string, path: string, name: string): boolean {
  const p = path.replace(/\//g, '\\/');
  return new RegExp(`\\bto=["']'?${p}'?["']`).test(content)
    || new RegExp(`:to=["']\\{\\s*(?:path:\\s*'${p}'|name:\\s*'${name}')`).test(content);
}

function getHomePath(): string {
  const p = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );
  expect(p).toBeDefined();
  return p!;
}

function getAboutPath(): string {
  const p = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );
  expect(p).toBeDefined();
  return p!;
}

test('Homepage exists', () => {
  expect(getHomePath()).toBeTruthy();
});

test('About page exists', () => {
  expect(getAboutPath()).toBeTruthy();
});

test('Homepage uses NuxtLink with to prop for the about link', () => {
  const content = read(getHomePath());

  expect(content).toMatch(LINK);
  expect(linksTo(content, '/about', 'about')).toBe(true);
});

test('About page uses NuxtLink with to prop for the home link', () => {
  const content = read(getAboutPath());

  expect(content).toMatch(LINK);
  expect(linksTo(content, '/', 'index')).toBe(true);
});

test('No raw anchor tags remain for internal navigation anywhere in app/', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));

  for (const file of files) {
    const content = read(file);
    expect(INTERNAL_ANCHOR.test(content), `${file} still has an internal <a href="/...">`).toBe(false);
    expect(EXTERNAL_INTERNAL_LINK.test(content), `${file} forces a full reload with \`external\``).toBe(false);
  }
});

test('NuxtLink never uses the href prop', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));

  for (const file of files) {
    const content = read(file);
    expect(content, `${file} uses href on a NuxtLink`).not.toMatch(/<(?:NuxtLink|nuxt-link)\b[^>]*\bhref=/);
  }
});

test('External link still points at the external site', () => {
  const content = read(getHomePath());

  // A plain <a href> and <NuxtLink to="https://..."> both render a normal external anchor.
  expect(content).toMatch(/<(?:a|NuxtLink|nuxt-link)\b[^>]*\b(?:href|to)=["']https:\/\/nuxt\.com/);
});

test('Pages still display content', () => {
  expect(readFileSync(getHomePath(), 'utf-8')).toMatch(/Home/);
  expect(readFileSync(getAboutPath(), 'utf-8')).toMatch(/About/);
});
