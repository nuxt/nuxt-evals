/**
 * Nuxt Page Meta and Layouts
 *
 * Tests whether the agent assigns the about page's layout with definePageMeta,
 * renders layouts through <NuxtLayout> in app.vue, and sets real document
 * titles: "Welcome Home", "About Us", and a blog title derived from the slug.
 * Verified on nuxt 4.6.4.
 *
 * Tricky because agents confuse page meta with head meta. definePageMeta({
 * title }) only lands in route.meta and never reaches <title> on its own, so it
 * counts only when app.vue or a layout passes route.meta.title to useHead or
 * useSeoMeta. A title set with useHead, useSeoMeta or the <Title> component
 * passes. Without <NuxtLayout> in app.vue's template the `layout` page meta is
 * ignored. The blog title passes when the title expression references the
 * slug, or when a binding derived from the slug (computed or plain const) is
 * what gets passed as the title. A plain const is fine because NuxtPage keys
 * dynamic routes by their params, so the page remounts for each slug. All
 * content checks run on comment-stripped source, so the starter's TODO
 * comments (which name the expected APIs) score nothing.
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

function readStripped(path: string): string {
  return stripComments(readFileSync(path, 'utf-8'));
}

// definePageMeta({ title }) only lands in route.meta; it reaches <title> only
// when app.vue or a layout passes route.meta.title as the `title` of
// useHead/useSeoMeta, directly or through a computed. An og:title alone (the
// docs' seo-meta snippet) leaves <title> empty, so it doesn't count.
function routeMetaTitleIsWired(): boolean {
  const candidates = [join(process.cwd(), 'app', 'app.vue')];
  const layoutsDir = join(process.cwd(), 'app', 'layouts');
  if (existsSync(layoutsDir)) {
    candidates.push(...readdirSync(layoutsDir).filter(f => f.endsWith('.vue')).map(f => join(layoutsDir, f)));
  }
  return candidates.some((p) => {
    if (!existsSync(p)) return false;
    const content = readStripped(p);
    if (/use(?:Head|SeoMeta)\s*\([\s\S]{0,300}?\btitle\s*:[^,\n}]*meta\.title/.test(content)) return true;
    const bindings = [...content.matchAll(/(?:const|let)\s+(\w+)\s*=\s*computed\s*\([\s\S]{0,160}?meta\.title/g)].map(m => m[1]);
    return bindings.some(name =>
      new RegExp(`use(?:Head|SeoMeta)\\s*\\([\\s\\S]{0,200}?\\btitle\\s*:\\s*(?:\\(\\s*\\)\\s*=>\\s*)?${name}\\b`).test(content)
      || (name === 'title' && /use(?:Head|SeoMeta)\s*\(\s*\{[\s\S]{0,200}?\btitle\s*[,}]/.test(content)));
  });
}

function setsTitle(content: string, title: string): boolean {
  const head = new RegExp(`use(?:Head|SeoMeta)\\s*\\((?:(?!definePageMeta)[\\s\\S]){0,300}?\\btitle\\s*:\\s*['"\`]${title}['"\`]`);
  const component = new RegExp(`<Title>\\s*${title}\\s*</Title>`);
  const pageMeta = new RegExp(`definePageMeta\\s*\\([\\s\\S]{0,300}?\\btitle\\s*:\\s*['"\`]${title}['"\`]`);
  return head.test(content) || component.test(content) || (pageMeta.test(content) && routeMetaTitleIsWired());
}

test('Homepage sets the "Welcome Home" title via a head/meta API', () => {
  const indexPath = join(process.cwd(), 'app', 'pages', 'index.vue');
  expect(existsSync(indexPath)).toBe(true);

  const content = readStripped(indexPath);
  expect(setsTitle(content, 'Welcome Home')).toBe(true);
});

test('About page assigns a custom layout via definePageMeta', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readStripped(aboutPath!);
  expect(content).toMatch(/definePageMeta/);
  expect(content).toMatch(/layout\s*:\s*['"][\w-]+['"]/);
});

test('About page sets the "About Us" title', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readStripped(aboutPath!);
  expect(setsTitle(content, 'About Us')).toBe(true);
});

test('Custom layout exists in layouts directory', () => {
  const layoutsDir = join(process.cwd(), 'app', 'layouts');

  expect(existsSync(layoutsDir)).toBe(true);

  const files = readdirSync(layoutsDir);
  expect(files.length).toBeGreaterThan(0);
});

test('Layout has slot for content', () => {
  const layoutsDir = join(process.cwd(), 'app', 'layouts');

  expect(existsSync(layoutsDir)).toBe(true);

  const files = readdirSync(layoutsDir);
  const layoutFile = files.find(f => f.endsWith('.vue'));

  expect(layoutFile).toBeDefined();

  const content = readStripped(join(layoutsDir, layoutFile!));
  expect(content).toMatch(/<slot/);
});

test('Dynamic blog page exists', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
  );

  expect(blogSlugPath).toBeDefined();
});

test('Blog page derives its title from the slug via useHead', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
  );

  expect(blogSlugPath).toBeDefined();

  const content = readStripped(blogSlugPath!);

  expect(content).toMatch(/useHead|useSeoMeta/);

  // The title must actually be dynamic: the title expression references the
  // slug (template literal, concatenation or function).
  const titleUsesSlug = /\btitle\s*:[^\n]{0,160}slug/.test(content);
  // Or a binding derived from the slug (computed or plain const) is what gets
  // passed as the title, including the shorthand `useHead({ title })`.
  // Computed bindings may wrap across lines; plain consts stay single-line.
  const slugBindings = [
    ...[...content.matchAll(/(?:const|let)\s+(\w+)\s*=[^\n]{0,160}slug/g)].map(m => m[1]),
    ...[...content.matchAll(/(?:const|let)\s+(\w+)\s*=\s*computed\s*\([\s\S]{0,160}?\bslug\b/g)].map(m => m[1]),
  ];
  const titleFromBinding = slugBindings.some(name =>
    new RegExp(`use(?:Head|SeoMeta)\\s*\\([\\s\\S]{0,200}?\\btitle\\s*:\\s*(?:\\(\\s*\\)\\s*=>\\s*)?${name}\\b`).test(content)
    || (name === 'title' && /use(?:Head|SeoMeta)\s*\(\s*\{[\s\S]{0,200}?\btitle\s*[,}]/.test(content)));
  const titleComponent = /<Title>[^<]*slug[^<]*<\/Title>/.test(content);
  expect(titleUsesSlug || titleFromBinding || titleComponent).toBe(true);
});

test('app.vue uses NuxtLayout for layout support', () => {
  const appPath = join(process.cwd(), 'app', 'app.vue');
  const content = readStripped(appPath);

  expect(content).toMatch(/<template>[\s\S]*<NuxtLayout[\s\S]*<\/template>/);
});
