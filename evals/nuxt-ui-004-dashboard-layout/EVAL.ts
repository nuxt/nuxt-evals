/**
 * Nuxt UI Dashboard Layout
 *
 * Tests whether the agent uses the correct Nuxt UI v4 dashboard components
 * (UDashboardGroup, UDashboardSidebar, UDashboardPanel, UDashboardNavbar)
 * to build admin interfaces.
 *
 * Tricky because agents often build custom sidebar layouts with divs and
 * CSS instead of using Nuxt UI's purpose-built dashboard components, or
 * they skip the required UDashboardGroup wrapper.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getLayoutContent(): string | undefined {
  const layoutsDir = join(process.cwd(), 'app', 'layouts');

  if (!existsSync(layoutsDir)) return undefined;

  const files = readdirSync(layoutsDir);
  const dashboardLayout = files.find(f => f.toLowerCase().includes('dashboard'));

  if (!dashboardLayout) return undefined;

  return readFileSync(join(layoutsDir, dashboardLayout), 'utf-8');
}

function getDashboardPageContent(): string | undefined {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'dashboard', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'dashboard.vue'),
    join(process.cwd(), 'app', 'pages', 'index.vue'),
  );

  if (!pagePath) return undefined;

  return readFileSync(pagePath, 'utf-8');
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

  // UDashboardSidebar should have collapsible prop or collapse functionality
  expect(content).toMatch(/collapsible|collapse/i);
});

test('Does not use raw HTML for sidebar layout', () => {
  const content = getLayoutContent()!;

  // Should NOT use custom <aside> or flex-based sidebar layouts
  expect(content).not.toMatch(/<aside[\s>]/);
});
