/**
 * Nuxt Content Data Collection
 *
 * Tests whether the agent uses type: 'data' for structured content that
 * doesn't map to renderable pages, instead of defaulting to type: 'page'.
 * Verified on @nuxt/content 3.16 / nuxt 4.6.4.
 *
 * Tricky because agents almost always use type: 'page' for everything,
 * but data collections are correct for structured records like team members,
 * products, or settings that don't have a 1-to-1 page relationship.
 *
 * Checks and why:
 * - content.config.ts defines a `team` collection with type 'data' and a
 *   schema naming name, role and bio. Without a schema the build still works,
 *   but every field outside the schema only lands in `item.meta`, so
 *   `member.name` renders nothing.
 * - content/team (or content/) holds at least 3 JSON/YAML files, and every
 *   one of them has name, role and bio, not only the first.
 * - app/pages/team.vue or team/index.vue queries the collection with
 *   queryCollection(...).all() and renders members with v-for, without
 *   <ContentRenderer> (data items have no body to render).
 *
 * Comments are stripped before matching, so a commented `type: 'data'` above
 * a real `type: 'page'` does not pass.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function stripComments(source: string): string {
  // Block and line comments only count when they start a line or follow
  // whitespace, so glob strings ('team/*.json') and URLs survive.
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readStripped(path: string): string {
  return stripComments(readFileSync(path, 'utf-8'));
}

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Content config defines a team collection with type data', () => {
  const configPath = join(process.cwd(), 'content.config.ts');
  expect(existsSync(configPath)).toBe(true);

  const content = readStripped(configPath);

  expect(content).toMatch(/team/);
  expect(content).toMatch(/defineCollection/);
  // Must use type: 'data' not type: 'page'
  expect(content).toMatch(/type\s*:\s*['"]data['"]/);
});

test('Team collection has schema with required fields', () => {
  const configPath = join(process.cwd(), 'content.config.ts');
  expect(existsSync(configPath)).toBe(true);

  const content = readStripped(configPath);

  expect(content).toMatch(/schema/);
  expect(content).toMatch(/name/);
  expect(content).toMatch(/role/);
  expect(content).toMatch(/bio/);
});

test('Team member JSON files exist', () => {
  const teamDir = findFile(
    join(process.cwd(), 'content', 'team'),
    join(process.cwd(), 'content'),
  );

  expect(teamDir).toBeDefined();

  const files = readdirSync(teamDir!).filter(f => f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
  expect(files.length).toBeGreaterThanOrEqual(3);
});

test('Every team member file has the required fields', () => {
  const teamDir = findFile(
    join(process.cwd(), 'content', 'team'),
    join(process.cwd(), 'content'),
  );

  expect(teamDir).toBeDefined();

  const files = readdirSync(teamDir!).filter(f => f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const member = readFileSync(join(teamDir!, file), 'utf-8');

    expect(member, file).toMatch(/name/);
    expect(member, file).toMatch(/role/);
    expect(member, file).toMatch(/bio/);
  }
});

test('Team page exists and queries the collection', () => {
  const teamPage = findFile(
    join(process.cwd(), 'app', 'pages', 'team.vue'),
    join(process.cwd(), 'app', 'pages', 'team', 'index.vue'),
  );

  expect(teamPage).toBeDefined();

  const content = readStripped(teamPage!);

  expect(content).toMatch(/queryCollection/);
  expect(content).toMatch(/\.all\(\)/);
});

test('Team page renders member data', () => {
  const teamPage = findFile(
    join(process.cwd(), 'app', 'pages', 'team.vue'),
    join(process.cwd(), 'app', 'pages', 'team', 'index.vue'),
  );

  expect(teamPage).toBeDefined();

  const content = readStripped(teamPage!);

  expect(content).toMatch(/v-for/);
  // Should NOT use ContentRenderer (data collections are not renderable)
  expect(content).not.toMatch(/<ContentRenderer/);
});
