/**
 * Shallow reactivity of useFetch/useAsyncData data (Nuxt 4 default)
 *
 * Since Nuxt 4, `data` from useFetch/useAsyncData is a `shallowRef`, not a deep
 * `ref` (useAsyncData defaults to `deep: false`, verified on nuxt 4.6.4).
 * Deep-mutating a nested field (`todo.done = !todo.done`) therefore does NOT
 * trigger a re-render. In the starter the browser still ticks the checkbox
 * natively, but the line-through bound to `todo.done` never appears.
 *
 * Valid fixes make the change reactive: opt into deep reactivity with
 * `{ deep: true }` (inline or via an options object), reassign the fetched ref
 * immutably (`todos.value = todos.value.map(...)`), call `triggerRef(todos)`,
 * render a deep `ref`/`reactive` copy of `todos.value`, or render the list from
 * deeply-reactive `useState`.
 *
 * Each heuristic is tied to the fetched ref or to the list the template's
 * v-for renders, because these non-fixes were confirmed in a browser to leave
 * the todo un-struck: an unrelated `x.value = ...` next to the nested
 * mutation, `ref(todos)` (Vue returns the same shallowRef), and an unrelated
 * `useState` call.
 *
 * Wrong prior: Nuxt 3 muscle memory assumes `data` is deeply reactive, so a
 * naive nested mutation "should" work. The prompt gives only the symptom.
 * https://nuxt.com/docs/4.x/getting-started/upgrade  (Shallow Data Reactivity)
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function getPageContent(): string {
  const p = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ].find(existsSync);
  if (!p) throw new Error('No page found');
  return stripComments(readFileSync(p, 'utf-8'));
}

test('Still fetches the todos with a Nuxt data primitive', () => {
  const content = getPageContent();
  expect(content).toMatch(/useFetch|useAsyncData/);
  expect(content).toMatch(/\/api\/todos/);
});

test('Makes the toggle reactive despite the shallowRef default', () => {
  const content = getPageContent();

  // Name of the ref the data primitive returned, and of the list the template
  // renders (they differ when the fix renders a deep copy or useState).
  const fetched = content.match(/const\s*\{[^}]*\bdata\b\s*(?::\s*(\w+))?[^}]*\}\s*=\s*(?:await\s+)?use(?:Lazy)?(?:Fetch|AsyncData)/)?.[1] ?? 'data';
  const rendered = content.match(/v-for=["'][^"']*\b(?:in|of)\s+(\w+)/)?.[1] ?? fetched;

  // deep: true must be an option of the data primitive itself, inline or as an
  // options const passed to it. The inline window must not cross into a watch()
  // call (deep-watching a shallowRef is not a fix).
  const optsDeep = /use(?:Lazy)?(?:Fetch|AsyncData)(?:(?!watch\s*\()[\s\S]){0,300}?deep\s*:\s*true/.test(content)
    || /const\s+(\w+)\s*=\s*\{[^}]*deep\s*:\s*true[^}]*\}[\s\S]*use(?:Lazy)?(?:Fetch|AsyncData)\s*(?:<[^>]*>)?\([^)]*\b\1\b/.test(content);
  // assignment (not a comparison) or triggerRef on the fetched or rendered ref;
  const reassigns = new RegExp(`\\b(?:${fetched}|${rendered})\\.value\\s*=(?!=)`).test(content);
  const triggers = new RegExp(`triggerRef\\s*\\(\\s*(?:${fetched}|${rendered})\\b`).test(content);
  // a deep copy of the fetched VALUE that the template then renders
  // (`ref(todos)` returns the same shallowRef, so it must wrap `todos.value`);
  const deepCopy = rendered !== fetched
    && new RegExp(`const\\s+${rendered}\\s*=\\s*(?:ref|reactive)\\s*(?:<[^>]*>)?\\(\\s*[^\\n]*${fetched}\\.value`).test(content);
  // or the rendered list is itself a deeply-reactive useState container.
  const deepState = new RegExp(`const\\s+${rendered}\\s*=\\s*useState\\s*(?:<[^>]*>)?\\(`).test(content);

  expect(optsDeep || reassigns || triggers || deepCopy || deepState).toBe(true);
});

test('Still renders the todo list with a checkbox toggle', () => {
  const content = getPageContent();
  expect(content).toMatch(/v-for/);
  expect(content).toMatch(/checkbox/);
  expect(content).toMatch(/@change|@click|v-model/);
});
