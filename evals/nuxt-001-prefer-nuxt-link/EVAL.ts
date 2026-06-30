/**
 * Prefer NuxtLink Over Anchor Tags
 *
 * Tests whether the agent replaces raw <a href> tags with <NuxtLink to>
 * for internal navigation to enable client-side routing — while leaving
 * external links as real anchors.
 *
 * Tricky because <a href> works functionally but causes full page reloads
 * instead of client-side navigation. The agent must know that NuxtLink uses
 * the "to" prop (not "href"), must convert every internal link, and must NOT
 * blindly convert the external link (a NuxtLink to an external URL is wrong).
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

const INTERNAL_ANCHOR = /<a[^>]*href=["']\/[^"']*["']/;

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
  const content = readFileSync(getHomePath(), 'utf-8');

  expect(content).toMatch(/<NuxtLink/);
  expect(content).toMatch(/to=["']\/about["']/);
});

test('About page uses NuxtLink with to prop for the home link', () => {
  const content = readFileSync(getAboutPath(), 'utf-8');

  expect(content).toMatch(/<NuxtLink/);
  expect(content).toMatch(/to=["']\/["']/);
});

test('No raw anchor tags remain for internal navigation anywhere in app/', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    expect(INTERNAL_ANCHOR.test(content), `${file} still has an internal <a href="/...">`).toBe(false);
  }
});

test('NuxtLink never uses the href prop', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    expect(content, `${file} uses href on a NuxtLink`).not.toMatch(/<NuxtLink[^>]*href=/);
  }
});

test('External link stays a real anchor (not converted to NuxtLink)', () => {
  const content = readFileSync(getHomePath(), 'utf-8');

  // The external URL must remain an <a href="https://...">, not a NuxtLink.
  expect(content).toMatch(/<a[^>]*href=["']https?:\/\//);
  expect(content).not.toMatch(/<NuxtLink[^>]*to=["']https?:\/\//);
});

test('Pages still display content', () => {
  expect(readFileSync(getHomePath(), 'utf-8')).toMatch(/Home/);
  expect(readFileSync(getAboutPath(), 'utf-8')).toMatch(/About/);
});
