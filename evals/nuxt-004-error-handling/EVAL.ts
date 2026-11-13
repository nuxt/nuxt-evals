/**
 * Nuxt Error Handling
 *
 * Tests whether the agent implements both global error handling (app/error.vue
 * reading the error and recovering with clearError) and a component-level
 * NuxtErrorBoundary that renders a fallback through its #error slot.
 * Verified on nuxt 4.6.4.
 *
 * Both levels are needed. On the client, Nuxt only shows the error page for
 * fatal or unhandled NuxtErrors; other errors thrown while rendering a
 * component do not reach error.vue, so without a boundary that part of the
 * page breaks. NuxtErrorBoundary renders only its #error slot once it catches
 * an error, so a boundary without that slot (for example with just an @error
 * listener) shows nothing in its place and fails. error.vue must live in app/,
 * the Nuxt 4 srcDir; a root-level or pages/ error.vue is never used.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
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

// The boundary may live in any page or app.vue — scan every Vue file under
// app/ so a correct placement is never missed by a hardcoded path order.
function findBoundaryContent(): string | undefined {
  const contents: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.name.endsWith('.vue')) {
        contents.push(stripComments(readFileSync(full, 'utf-8')));
      }
    }
  }

  scan(join(process.cwd(), 'app'));
  return contents.find(c => /<NuxtErrorBoundary/.test(c));
}

test('Global error page exists', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
  );

  expect(errorPath).toBeDefined();
});

test('Error page uses useError or error prop', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
  );

  expect(errorPath).toBeDefined();

  const content = stripComments(readFileSync(errorPath!, 'utf-8'));

  // Accept useError() or defineProps with error
  expect(content).toMatch(/useError|defineProps|props\.error|error\.statusCode|error\.message/);
});

test('Error page has clearError functionality', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
  );

  expect(errorPath).toBeDefined();

  const content = stripComments(readFileSync(errorPath!, 'utf-8'));

  expect(content).toMatch(/clearError/);
});

test('A page or app.vue uses NuxtErrorBoundary', () => {
  expect(findBoundaryContent()).toBeDefined();
});

test('NuxtErrorBoundary has error slot', () => {
  const content = findBoundaryContent();

  if (content) {
    expect(content).toMatch(/#error\b|v-slot:error\b/);
  }
});

