/**
 * Nuxt UI Dashboard Layout
 *
 * Tests whether the agent uses the Nuxt UI v4 dashboard components
 * (UDashboardGroup, UDashboardSidebar, UDashboardPanel, UDashboardNavbar) to
 * build an admin layout. Verified on @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * Tricky because agents often build custom sidebar layouts with divs and
 * CSS instead of using Nuxt UI's dashboard components, or they skip the
 * required UDashboardGroup wrapper.
 *
 * Checks and why:
 * - A layouts/*dashboard* file wraps everything in UDashboardGroup, holds a
 *   UDashboardSidebar with UNavigationMenu, and renders <slot /> for pages.
 * - UDashboardSidebar has the `collapsible` prop. Collapsing is a no-op
 *   without it (useResizable returns early when collapsible is false), so
 *   using the `collapsed` slot prop or a UDashboardSidebarCollapse button on
 *   its own does not count.
 * - No raw <aside> sidebar.
 * - The dashboard page uses UDashboardPanel with UDashboardNavbar and assigns
 *   the layout through definePageMeta.
 *
 * Comments are stripped before matching, so naming the components in a
 * comment over a div layout does not pass. Opening tags are read with a
 * quote-aware scanner so `>` inside an attribute value does not end the tag.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function stripComments(source: string): string {
  // Block and line comments only count when they start a line or follow
  // whitespace, so glob strings and URLs survive.
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Returns the attribute text of every opening `<tag ...>` in the source.
 * Quoted attribute values may contain `>` (arrow functions, comparisons).
 */
function getOpeningTags(content: string, tag: string): string[] {
  const tags: string[] = [];
  const start = new RegExp(`<${tag}(?=[\\s/>])`, 'g');
  let match: RegExpExecArray | null;

  while ((match = start.exec(content))) {
    let quote: string | null = null;
    let i = match.index + match[0].length;

    for (; i < content.length; i++) {
      const char = content[i];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
    }

    tags.push(content.slice(match.index + match[0].length, i));
  }

  return tags;
}

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getLayoutContent(): string | undefined {
  const layoutsDir = join(process.cwd(), 'app', 'layouts');

  if (!existsSync(layoutsDir)) return undefined;

  const files = readdirSync(layoutsDir);
  const dashboardLayout = files.find(f => f.toLowerCase().includes('dashboard'));

  if (!dashboardLayout) return undefined;

  return stripComments(readFileSync(join(layoutsDir, dashboardLayout), 'utf-8'));
}

function getDashboardPageContent(): string | undefined {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'dashboard', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'dashboard.vue'),
    join(process.cwd(), 'app', 'pages', 'index.vue'),
  );

  if (!pagePath) return undefined;

  return stripComments(readFileSync(pagePath, 'utf-8'));
}

test('Dashboard layout exists', () => {
  const content = getLayoutContent();

  expect(content).toBeDefined();
});

test('Layout uses UDashboardGroup wrapper', () => {
  const content = getLayoutContent()!;

  // UDashboardGroup is the required root wrapper for dashboard layouts
  expect(content).toMatch(/UDashboardGroup/);
});

test('Layout uses UDashboardSidebar', () => {
  const content = getLayoutContent()!;

  expect(content).toMatch(/UDashboardSidebar/);
});

test('Sidebar uses UNavigationMenu for navigation', () => {
  const content = getLayoutContent()!;

  // Should use UNavigationMenu with vertical orientation for sidebar nav
  expect(content).toMatch(/UNavigationMenu/);
});

test('Layout has slot for page content', () => {
  const content = getLayoutContent()!;

  // Layout must have <slot /> for NuxtPage to render inside
  expect(content).toMatch(/<slot\s*\/?>|<slot>/);
});

test('Dashboard page exists', () => {
  const content = getDashboardPageContent();

  expect(content).toBeDefined();
});

test('Dashboard page uses UDashboardPanel', () => {
  const content = getDashboardPageContent()!;

  expect(content).toMatch(/UDashboardPanel/);
});

test('Dashboard page uses UDashboardNavbar', () => {
  const content = getDashboardPageContent()!;

  // UDashboardNavbar goes inside UDashboardPanel's #header slot
  expect(content).toMatch(/UDashboardNavbar/);
});

test('Dashboard page references the dashboard layout', () => {
  const content = getDashboardPageContent()!;

  // Should reference the dashboard layout via definePageMeta
  expect(content).toMatch(/definePageMeta/);
  expect(content).toMatch(/layout/);
});

test('Sidebar is collapsible', () => {
  const content = getLayoutContent()!;

  // The collapsible prop is what enables collapsing; without it the
  // collapsed slot prop and UDashboardSidebarCollapse do nothing.
  const sidebars = getOpeningTags(content, 'UDashboardSidebar');
  expect(sidebars.some(attrs => /(^|\s)(:|v-bind:)?collapsible(\s|=|\/|$)/.test(attrs))).toBe(true);
});

test('Does not use raw HTML for sidebar layout', () => {
  const content = getLayoutContent()!;

  // Should NOT use custom <aside> or flex-based sidebar layouts
  expect(content).not.toMatch(/<aside[\s>]/);
});
