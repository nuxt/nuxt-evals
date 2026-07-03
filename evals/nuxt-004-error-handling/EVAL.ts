/**
 * Nuxt Error Handling
 *
 * Tests whether the agent implements both global error handling (error.vue)
 * and component-level error boundaries (NuxtErrorBoundary).
 *
 * Tricky because agents might only implement one level of error handling
 * or use incorrect error utilities.
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
    expect(content).toMatch(/#error|v-slot:error|@error/);
  }
});

