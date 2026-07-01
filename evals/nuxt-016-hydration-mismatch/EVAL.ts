/**
 * Fix an SSR hydration mismatch from a non-deterministic render
 *
 * The starter renders `new Date()` computed in <script setup>. That value is
 * produced once on the server and again (differently) on the client, so the
 * server-rendered HTML and the client render disagree — a hydration mismatch.
 *
 * The fix is to make the value stable across the SSR/client boundary: compute
 * it once with useState (serialized into the payload), defer it to the client
 * with onMounted, or isolate it with <ClientOnly>.
 *
 * Wrong-prior: models treat setup like a plain client component and leave
 * server/client-divergent values in the render — it "works" but warns and
 * flickers, which is invisible unless you watch SSR hydration.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const p = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );
  if (!p) throw new Error('No page found');
  return readFileSync(p, 'utf-8');
}

test('Still displays the load time', () => {
  const content = getPageContent();

  expect(content).toMatch(/\{\{/);
  expect(content).toMatch(/time|now/i);
});

test('Uses an SSR-safe pattern (useState, onMounted, or ClientOnly)', () => {
  const content = getPageContent();

  // The value must be stabilised across the SSR/client boundary.
  expect(content).toMatch(/useState\s*\(|onMounted\s*\(|<ClientOnly/);
});

test('Does not interpolate a non-deterministic value directly in the template', () => {
  const content = getPageContent();

  // e.g. {{ new Date().toLocaleTimeString() }} would mismatch on every render.
  expect(content).not.toMatch(/\{\{[^}]*(?:new Date|Date\.now|Math\.random)/);
});
