/**
 * Nuxt UI Landing Page
 *
 * Tests whether the agent uses the correct Nuxt UI page components
 * (UPageHero, UPageSection) with proper props.
 *
 * Tricky because agents might use generic components instead of Nuxt UI's
 * specialized page components.
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
    join(process.cwd(), 'pages', 'index.vue'),
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
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UPageHero or ULandingHero component', () => {
  const content = getLandingPageContent();

  // Accept both UPageHero and ULandingHero (different Nuxt UI versions)
  expect(content).toMatch(/UPageHero|ULandingHero|UHero/);
});

test('Hero has title and description', () => {
  const content = getLandingPageContent();

  expect(content).toMatch(/title/);
  expect(content).toMatch(/description/);
});

test('Has call-to-action buttons or links', () => {
  const content = getLandingPageContent();

  // Should have links/buttons for CTA
  expect(content).toMatch(/links|UButton|button/i);
});

test('Uses UPageSection or features section', () => {
  const content = getLandingPageContent();

  // Accept various feature section patterns
  expect(content).toMatch(/UPageSection|ULandingSection|UPageFeatures|features/i);
});

test('Has multiple features defined', () => {
  const content = getLandingPageContent();

  // Should have feature items (look for arrays or repeated patterns)
  const featureIndicators = content.match(/icon|feature|title/gi);
  expect(featureIndicators && featureIndicators.length >= 3).toBe(true);
});
