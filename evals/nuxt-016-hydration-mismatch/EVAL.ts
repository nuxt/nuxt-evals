/**
 * Avoid an SSR hydration mismatch when showing the load time (constructive)
 *
 * The task asks the agent to add the page's load time — with no mention of SSR
 * or hydration. The naive answer, `new Date()` computed in <script setup> and
 * rendered, is produced once on the server and again (differently) on the
 * client, so the SSR HTML and the client render disagree — a hydration mismatch.
 *
 * A correct answer makes the value stable across the SSR/client boundary:
 * compute it once with useState (serialized into the payload), defer it to the
 * client with onMounted, or isolate it with <ClientOnly>.
 *
 * Wrong-prior: models treat setup like a plain client component and render a
 * server/client-divergent value — it "works" but warns and flickers, invisible
 * unless you watch SSR hydration. The prompt gives no symptom, so the model
 * must anticipate the SSR boundary unprompted.
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

test('Displays the load time', () => {
  const content = getPageContent();

  // Something dynamic must be rendered (the task is to show the load time).
  expect(content).toMatch(/\{\{/);
  expect(content).toMatch(/time|now|loaded|clock/i);
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
