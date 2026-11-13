/**
 * Avoid an SSR hydration mismatch when showing the load time (constructive)
 *
 * The task asks the agent to add the page's load time, with no mention of SSR
 * or hydration. The naive answer, `new Date()` computed in <script setup> and
 * rendered, runs once on the server and again (differently) on the client, so
 * the SSR HTML and the client render disagree: a hydration mismatch.
 *
 * A correct answer makes the first client render match the server HTML:
 * compute the formatted string once with useState/useAsyncData (serialized
 * into the payload), defer it to the client with onMounted/onNuxtReady,
 * isolate it with <ClientOnly>, or render it with <NuxtTime>, which reuses the
 * server's datetime attribute during hydration and reformats it for the
 * visitor's locale before Vue hydrates (verified on nuxt 4.6.4).
 *
 * Two near-misses are rejected, both confirmed to log "Hydration completed but
 * contains mismatches." in a browser whose time zone differs from the server's:
 * - a ref seeded with the current time and overwritten in onMounted (the
 *   hydration render already used a fresh value);
 * - a timestamp kept in useState but formatted with toLocale*String on render
 *   (server and client format it in different time zones and locales).
 *
 * Wrong prior: models treat setup like a plain client component and render a
 * server/client-divergent value. It "works" but warns and flickers, invisible
 * unless you watch SSR hydration. The prompt gives no symptom, so the model
 * must anticipate the SSR boundary unprompted.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
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

function getPageContent(): string {
  const p = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );
  if (!p) throw new Error('No page found');
  return stripComments(readFileSync(p, 'utf-8'));
}

test('Displays the load time', () => {
  const content = getPageContent();

  // Something dynamic must be rendered (the task is to show the load time).
  expect(content).toMatch(/\{\{|<NuxtTime\b/);
  expect(content).toMatch(/time|now|loaded|clock/i);
});

test('Uses an SSR-safe pattern (useState, onMounted, ClientOnly, ...)', () => {
  const content = getPageContent();

  // The value must be stabilised across the SSR/client boundary. Accept every
  // genuinely safe pattern: payload-serialized state (useState/useAsyncData),
  // client-deferred computation (onMounted/onNuxtReady), render isolation
  // (<ClientOnly>), or <NuxtTime>. import.meta.client in setup is NOT safe,
  // it still renders differently on server and client.
  expect(content).toMatch(
    /useState\s*\(|use(?:Lazy)?AsyncData\s*\(|onMounted\s*\(|onNuxtReady\s*\(|<ClientOnly|<NuxtTime\b/,
  );
});

test('Does not interpolate a non-deterministic value directly in the template', () => {
  const content = getPageContent();

  // e.g. {{ new Date().toLocaleTimeString() }} would mismatch on every render.
  expect(content).not.toMatch(/\{\{[^}]*(?:new Date|Date\.now|Math\.random)/);
});

test('The first client render reproduces the server value', () => {
  const content = getPageContent();

  // A ref seeded with the current time renders a fresh value during hydration,
  // even if onMounted overwrites it afterwards. <ClientOnly> and <NuxtTime>
  // don't render it during hydration (NuxtTime reuses the server datetime
  // attribute), so they make that seed safe.
  if (!/<ClientOnly|<NuxtTime\b/.test(content)) {
    expect(content).not.toMatch(/(?:ref|shallowRef|reactive)\s*(?:<[^>]*>)?\(\s*(?:new Date|Date\.now)/);
  }

  // When only the payload (useState/useAsyncData) keeps the value stable, the
  // locale/time-zone formatting must happen inside that initializer: formatting a
  // serialized timestamp on render gives different text on server and client.
  const clientDeferred = /onMounted\s*\(|onNuxtReady\s*\(|<ClientOnly|<NuxtTime\b/.test(content);
  if (!clientDeferred) {
    const FORMAT = /toLocale\w*String|Intl\.DateTimeFormat/g;
    const total = (content.match(FORMAT) || []).length;
    const inside = (content.match(/use(?:State|(?:Lazy)?AsyncData)\s*(?:<[^>]*>)?\((?:(?!\n\S)[\s\S])*?(?:toLocale\w*String|Intl\.DateTimeFormat)/g) || []).length;
    expect(total).toBe(inside);
  }
});
