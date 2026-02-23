/**
 * Nuxt Content Data Collection
 *
 * Tests whether the agent uses type: 'data' for structured content that
 * doesn't map to renderable pages, instead of defaulting to type: 'page'.
 *
 * Tricky because agents almost always use type: 'page' for everything,
 * but data collections are correct for structured records like team members,
 * products, or settings that don't have a 1-to-1 page relationship.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function findDir(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Content config defines a team collection with type data', () => {
  const configPath = findFile(
    join(process.cwd(), 'content.config.ts'),
    join(process.cwd(), 'content.config.js'),
  );

  expect(configPath).toBeDefined();

  const content = readFileSync(configPath!, 'utf-8');

  expect(content).toMatch(/team/);
  expect(content).toMatch(/defineCollection/);
  // Must use type: 'data' not type: 'page'
  expect(content).toMatch(/type\s*:\s*['"]data['"]/);
});

test('Team collection has schema with required fields', () => {
  const configPath = findFile(
    join(process.cwd(), 'content.config.ts'),
    join(process.cwd(), 'content.config.js'),
  );

  const content = readFileSync(configPath!, 'utf-8');

  expect(content).toMatch(/schema/);
  expect(content).toMatch(/name/);
  expect(content).toMatch(/role/);
  expect(content).toMatch(/bio/);
});

test('Team member JSON files exist', () => {
  const teamDir = findDir(
    join(process.cwd(), 'content', 'team'),
    join(process.cwd(), 'content'),
  );

  expect(teamDir).toBeDefined();

  const files = readdirSync(teamDir!).filter(f => f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
  expect(files.length).toBeGreaterThanOrEqual(3);
});

test('Team member files have required fields', () => {
  const teamDir = findDir(
    join(process.cwd(), 'content', 'team'),
    join(process.cwd(), 'content'),
  );

  const files = readdirSync(teamDir!).filter(f => f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
  const firstFile = readFileSync(join(teamDir!, files[0]), 'utf-8');

  expect(firstFile).toMatch(/name/);
  expect(firstFile).toMatch(/role/);
  expect(firstFile).toMatch(/bio/);
});

test('Team page exists and queries the collection', () => {
  const teamPage = findFile(
    join(process.cwd(), 'app', 'pages', 'team.vue'),
    join(process.cwd(), 'app', 'pages', 'team', 'index.vue'),
    join(process.cwd(), 'pages', 'team.vue'),
    join(process.cwd(), 'pages', 'team', 'index.vue'),
  );

  expect(teamPage).toBeDefined();

  const content = readFileSync(teamPage!, 'utf-8');

  expect(content).toMatch(/queryCollection/);
  expect(content).toMatch(/\.all\(\)/);
});

test('Team page renders member data', () => {
  const teamPage = findFile(
    join(process.cwd(), 'app', 'pages', 'team.vue'),
    join(process.cwd(), 'app', 'pages', 'team', 'index.vue'),
    join(process.cwd(), 'pages', 'team.vue'),
    join(process.cwd(), 'pages', 'team', 'index.vue'),
  );

  const content = readFileSync(teamPage!, 'utf-8');

  expect(content).toMatch(/v-for/);
  // Should NOT use ContentRenderer (data collections are not renderable)
  expect(content).not.toMatch(/<ContentRenderer/);
});
