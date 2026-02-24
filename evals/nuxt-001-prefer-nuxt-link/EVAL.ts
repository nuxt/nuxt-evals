/**
 * Prefer NuxtLink Over Anchor Tags
 *
 * Tests whether the agent replaces raw <a href> tags with <NuxtLink to>
 * for internal navigation to enable client-side routing.
 *
 * Tricky because <a href> works functionally but causes full page reloads
 * instead of client-side navigation. The agent must know that NuxtLink
 * uses the "to" prop, not "href".
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Homepage exists', () => {
  const homePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(homePath).toBeDefined();
});

test('About page exists', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();
});

test('Homepage uses NuxtLink with to prop', () => {
  const homePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(homePath).toBeDefined();
  const content = readFileSync(homePath!, 'utf-8');

  expect(content).toMatch(/<NuxtLink/);
  expect(content).toMatch(/to=["']\/about["']/);
});

test('About page uses NuxtLink with to prop', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();
  const content = readFileSync(aboutPath!, 'utf-8');

  expect(content).toMatch(/<NuxtLink/);
  expect(content).toMatch(/to=["']\/["']/);
});

test('No raw anchor tags for internal navigation', () => {
  const homePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(homePath).toBeDefined();
  expect(aboutPath).toBeDefined();

  const homeContent = readFileSync(homePath!, 'utf-8');
  expect(homeContent).not.toMatch(/<a[^>]*href=["']\/[^"']*["']/);

  const aboutContent = readFileSync(aboutPath!, 'utf-8');
  expect(aboutContent).not.toMatch(/<a[^>]*href=["']\/[^"']*["']/);
});

test('NuxtLink does not use href prop', () => {
  const homePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(homePath).toBeDefined();
  const content = readFileSync(homePath!, 'utf-8');

  expect(content).not.toMatch(/<NuxtLink[^>]*href=/);
});

test('Pages still display content', () => {
  const homePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(homePath).toBeDefined();
  expect(aboutPath).toBeDefined();

  const homeContent = readFileSync(homePath!, 'utf-8');
  expect(homeContent).toMatch(/Home/);

  const aboutContent = readFileSync(aboutPath!, 'utf-8');
  expect(aboutContent).toMatch(/About/);
});
