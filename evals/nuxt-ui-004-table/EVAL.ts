/**
 * Nuxt UI Table
 *
 * Tests whether the agent builds the users table with UTable and v4 column
 * definitions, and wires the search input to the rows. Verified against
 * @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * Tricky because agents often use native <table> elements, use wrong prop
 * names like :rows or :items instead of v4's :data prop, or write v2-style
 * columns ({ key, label }). TanStack throws when a column has no id,
 * accessorKey or string header, so the page builds but returns a 500.
 *
 * What is checked, and why:
 * - Every Vue file under app/ is scanned with comments stripped, so an
 *   extracted component (e.g. UsersTable.vue) or any page path counts, and a
 *   commented-out <UTable> does not.
 * - :columns is optional: UTable infers columns from the data keys. When
 *   :columns is bound, the definitions must use accessorKey or accessorFn.
 * - Sample data may live in app/, server/ (a server route read with useFetch)
 *   or shared/, so the email count scans all three.
 * - The search must reach the table: either UTable's v-model:global-filter,
 *   an inline :data="..." expression that uses the UInput's v-model ref, or a
 *   declaration that uses the ref and is bound in a template attribute. The
 *   last case is checked per file, so a page can filter and pass the rows to
 *   an extracted table component as a prop. An input that filters nothing
 *   fails.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readFiles(dirs: string[], exts: string[]): string[] {
  const results: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (exts.some(ext => entry.name.endsWith(ext))) {
        results.push(stripComments(readFileSync(full, 'utf-8')));
      }
    }
  }

  for (const dir of dirs) scan(join(process.cwd(), dir));
  return results;
}

function getVueFiles(): string[] {
  return readFiles(['app'], ['.vue']);
}

function getAllVueFiles(): string {
  return getVueFiles().join('\n');
}

function getAllSources(): string {
  return readFiles(['app', 'server', 'shared'], ['.vue', '.ts', '.js', '.json']).join('\n');
}

// Names declared with const/let whose initializer references `ident`.
function declarationsUsing(script: string, ident: string): string[] {
  const names: string[] = [];
  const uses = new RegExp(`\\b${ident}\\b`);

  for (const match of script.matchAll(/(?:const|let)\s+(\{[^}]*\}|\w+)[^=]*=/g)) {
    const rest = script.slice(match.index! + match[0].length);
    const end = rest.search(/\n(?:const|let|function)\b|<\/script>/);
    if (uses.test(rest.slice(0, end < 0 ? undefined : end))) {
      names.push(...(match[1].match(/\w+/g) ?? []));
    }
  }

  return names;
}

test('Page exists', () => {
  const pagePath = [
    join(process.cwd(), 'app', 'pages'),
    join(process.cwd(), 'app', 'app.vue'),
  ].find(p => existsSync(p));

  expect(pagePath).toBeDefined();
});

test('Uses UTable component', () => {
  expect(getAllVueFiles()).toMatch(/<UTable\b/);
});

test('UTable uses :data prop', () => {
  // v4 pattern: <UTable :data="users" />, not :rows or :items
  expect(getAllVueFiles()).toMatch(/:data\b/);
});

test('Columns are v4 definitions or inferred from data', () => {
  // Without :columns, UTable generates columns from the data keys.
  // With :columns, v2-style { key, label } crashes TanStack at render.
  if (/:columns\b/.test(getAllVueFiles())) {
    expect(getAllSources()).toMatch(/accessorKey|accessorFn/);
  }
});

test('Does not use native table elements', () => {
  const content = getAllVueFiles();

  expect(content).not.toMatch(/<table[\s>]/);
  expect(content).not.toMatch(/<tr[\s>]/);
});

test('Has user data with required fields', () => {
  const content = getAllSources();

  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
  expect(content).toMatch(/role/i);
});

test('Has at least 5 data items', () => {
  // Count email-like patterns (user@domain.tld) to verify sufficient data rows
  const emailMatches = getAllSources().match(/[\w.-]+@[\w.-]+\.\w+/g) ?? [];
  expect(emailMatches.length).toBeGreaterThanOrEqual(5);
});

test('Search input is wired to the table', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/<UInput\b/);

  // UTable's built-in global filter
  if (/global-filter|globalFilter/.test(content)) return;

  const files = getVueFiles();
  const searches = [...content.matchAll(/<UInput\b[^>]*?v-model(?::model-value)?="(\w+)/g)].map(m => m[1]);
  expect(searches.length, 'UInput v-model').toBeGreaterThan(0);

  const wired = searches.some((search) => {
    const uses = new RegExp(`\\b${search}\\b`);

    return files.some((file) => {
      // Inline: :data="users.filter(u => u.name.includes(search))"
      const dataExpressions = [...file.matchAll(/(?::|v-bind:)data="([^"]*)"/g)].map(m => m[1]);
      if (dataExpressions.some(expression => uses.test(expression))) return true;

      // A declaration derived from the search ref, bound in this file's template
      // (:data="filteredUsers" or :users="filteredUsers" on an extracted table)
      const script = (file.match(/<script[\s\S]*?<\/script>/g) ?? []).join('\n');
      const template = file.replace(/<script[\s\S]*?<\/script>/g, '');
      const bindings = [...template.matchAll(/\s(?::|v-bind:)[\w.-]+="([^"]*)"/g)].map(m => m[1]);

      return declarationsUsing(script, search).some((name) => {
        const bound = new RegExp(`\\b${name}\\b`);
        return bindings.some(binding => bound.test(binding));
      });
    });
  });

  expect(wired, 'the search ref feeds the rows given to UTable').toBe(true);
});
