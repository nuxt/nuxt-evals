/**
 * Prefer NuxtImg Over Raw Img Tags
 *
 * Tests whether the agent replaces raw <img> tags with <NuxtImg> or
 * <NuxtPicture> and installs and registers @nuxt/image.
 *
 * Tricky because <img> works fine but misses the optimization, responsive
 * sizing and format conversion @nuxt/image provides.
 *
 * Checks:
 * - @nuxt/image is in package.json and in the modules array. On nuxt 4.6.4 a
 *   production build also fails (NUXT_B3004) when NuxtImg is used without the
 *   module, so the build step backs up the config check;
 * - the gallery uses <NuxtImg>/<NuxtPicture> and no raw <img> is left. The
 *   images may live in the page or in a component, so all of app/ is scanned,
 *   with HTML comments stripped;
 * - <NuxtImage> is rejected: @nuxt/image 2.x only registers NuxtImg and
 *   NuxtPicture, so <NuxtImage> builds but renders nothing;
 * - alt text and all four images are kept;
 * - every NuxtImg/NuxtPicture keeps a width and height to prevent layout shift.
 *   Static attributes and bound ones (a v-for over a data array) are both fine,
 *   as long as the original sizes are still in the source.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// The gallery may stay in the page or be extracted into components, and the
// image data may move into a script or a .ts file, so scan the whole app/ source.
function getAppContent(): string {
  const out: string[] = [];
  const scan = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) scan(full);
      else if (/\.(vue|ts|js)$/.test(e.name)) out.push(readFileSync(full, 'utf-8').replace(/<!--[\s\S]*?-->/g, ''));
    }
  };
  scan(join(process.cwd(), 'app'));
  if (!out.length) throw new Error('No page found');
  return out.join('\n');
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
  const content = getAppContent();

  expect(content).toMatch(/<(?:NuxtImg|NuxtPicture|nuxt-img|nuxt-picture)[\s>/]/);
  expect(content).not.toMatch(/<(?:NuxtImage|nuxt-image)[\s>/]/);
});

test('No raw img tags remain', () => {
  const content = getAppContent();

  expect(content).not.toMatch(/<img[\s>]/);
});

test('Images still have alt text', () => {
  const content = getAppContent();

  // Should still have meaningful alt attributes, written on the tag or kept in
  // the data array a v-for binds (`:alt="photo.alt"` or `v-bind="photo"`).
  expect(content).toMatch(/alt=["'][^"']+["']|\balt\s*:\s*['"][^'"]+['"]/);
});

test('Still displays all four images', () => {
  const content = getAppContent();

  expect(content).toMatch(/hero/);
  expect(content).toMatch(/nature/);
  expect(content).toMatch(/city/);
  expect(content).toMatch(/ocean/);
});

test('Images preserve width and height to prevent CLS', () => {
  const content = getAppContent();

  // The original <img> tags have explicit width and height attributes. These
  // must be carried over to reserve layout space and prevent Cumulative Layout
  // Shift. Static or bound (v-for over a data array) dimensions both work, as
  // long as the original intrinsic sizes are still in the source.
  const tags = content.match(/<(?:NuxtImg|NuxtPicture|nuxt-img|nuxt-picture)\b[^>]*>/g) || [];
  expect(tags.length).toBeGreaterThan(0);
  for (const tag of tags) {
    // `v-bind="image"` spreads width and height from the data array.
    if (/\sv-bind=/.test(tag)) continue;
    expect(tag).toMatch(/\swidth=|:width=/);
    expect(tag).toMatch(/\sheight=|:height=/);
  }
  for (const n of ['1200', '800', '1000', '667', '900', '600']) expect(content).toContain(n);
});

test('Page still has gallery structure', () => {
  const content = getAppContent();

  expect(content).toMatch(/Gallery/i);
});
