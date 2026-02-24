/**
 * Prefer NuxtImg Over Raw Img Tags
 *
 * Tests whether the agent replaces raw <img> tags with <NuxtImg> or
 * <NuxtPicture> and installs @nuxt/image.
 *
 * Tricky because <img> works fine but misses automatic optimization,
 * lazy loading, responsive sizing, and format conversion that @nuxt/image
 * provides. The agent must also install and configure the module.
 *
 * Note: @nuxt/image provides <NuxtImg> (not <NuxtImage>) and <NuxtPicture>.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return readFileSync(pagePath, 'utf-8');
}

test('@nuxt/image is installed', () => {
  const packagePath = join(process.cwd(), 'package.json');
  const content = readFileSync(packagePath, 'utf-8');
  const pkg = JSON.parse(content);

  const hasImage = pkg.dependencies?.['@nuxt/image'] || pkg.devDependencies?.['@nuxt/image'];
  expect(hasImage).toBeTruthy();
});

test('@nuxt/image is configured in nuxt.config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/@nuxt\/image/);
  expect(content).toMatch(/modules\s*:\s*\[[\s\S]*@nuxt\/image/);
});

test('Uses NuxtImg or NuxtPicture instead of raw img', () => {
  const content = getPageContent();

  expect(content).toMatch(/<NuxtImg|<NuxtImage|<NuxtPicture|<nuxt-img|<nuxt-image|<nuxt-picture/);
});

test('No raw img tags remain', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/<img[\s>]/);
});

test('Images still have alt text', () => {
  const content = getPageContent();

  // Should still have meaningful alt attributes
  expect(content).toMatch(/alt=["'][^"']+["']/);
});

test('Still displays all four images', () => {
  const content = getPageContent();

  expect(content).toMatch(/hero/);
  expect(content).toMatch(/nature/);
  expect(content).toMatch(/city/);
  expect(content).toMatch(/ocean/);
});

test('Page still has gallery structure', () => {
  const content = getPageContent();

  expect(content).toMatch(/Gallery/i);
});
