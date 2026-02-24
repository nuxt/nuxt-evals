/**
 * Nuxt UI Landing Page
 *
 * Tests whether the agent uses the correct Nuxt UI v4 page components
 * (UPageHero, UPageSection) with proper props like `links` and `features`.
 *
 * Tricky because agents might use generic components instead of Nuxt UI's
 * specialized page components, or use non-existent component names from
 * older versions (ULandingHero, ULandingSection).
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getLandingPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) {
    throw new Error('No landing page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Landing page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UPageHero component', () => {
  const content = getLandingPageContent();

  // UPageHero is the correct v4 component for hero sections
  expect(content).toMatch(/UPageHero/);
});

test('Hero has title and description', () => {
  const content = getLandingPageContent();

  expect(content).toMatch(/title/);
  expect(content).toMatch(/description/);
});

test('Hero has call-to-action links', () => {
  const content = getLandingPageContent();

  // UPageHero accepts a :links prop for CTA buttons (preferred v4 pattern)
  // Also accept UButton as standalone CTA approach
  expect(content).toMatch(/:links|links=|UButton/);
});

test('Uses UPageSection for features', () => {
  const content = getLandingPageContent();

  // UPageSection is the correct v4 component for content sections
  expect(content).toMatch(/UPageSection/);
});

test('Features section has feature items', () => {
  const content = getLandingPageContent();

  // UPageSection accepts a :features prop with array of { title, description, icon }
  // Also accept UPageFeature or manual feature items within UPageSection
  expect(content).toMatch(/:features|features=|UPageFeature/);
});

test('Features have icons', () => {
  const content = getLandingPageContent();

  // Features should have icons (i-lucide-* or similar Iconify names)
  expect(content).toMatch(/i-[a-z]+-[a-z]+|icon/i);
});
