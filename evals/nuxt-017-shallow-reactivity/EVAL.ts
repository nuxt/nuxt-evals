/**
 * Shallow reactivity of useFetch/useAsyncData data (Nuxt 4 default)
 *
 * Since Nuxt 4, `data` from useFetch/useAsyncData is a `shallowRef`, not a deep
 * `ref`. Deep-mutating a nested field (`todo.done = !todo.done`) therefore does
 * NOT trigger a re-render — the starter's checkbox only updates on refresh.
 *
 * Valid fixes make the change reactive: opt into deep reactivity with
 * `{ deep: true }`, reassign the ref immutably (`todos.value = todos.value.map(...)`),
 * call `triggerRef(todos)`, hold the list in a deep `ref`/`reactive` copy,
 * or keep it in deeply-reactive `useState`.
 *
 * Wrong-prior: Nuxt-3 muscle memory assumes `data` is deeply reactive, so a
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

  // Any of the valid strategies for updating a shallowRef reactively.
  // Each heuristic is anchored so a non-fix cannot satisfy it:
  // deep: true must be an option of the data primitive itself — a tempered
  // window that must not cross into a watch() call (deep-watching a
  // shallowRef is not a fix);
  const optsDeep = /use(?:Fetch|AsyncData)(?:(?!watch\s*\()[\s\S]){0,300}?deep\s*:\s*true/.test(content);
  // assignment, not a comparison (=== / ==);
  const reassigns = /\.value\s*=(?!=)/.test(content);
  const triggers = /triggerRef\s*\(/.test(content);
  // a deep local copy must wrap the fetched todos inside the call parens —
  // an unrelated ref(false) elsewhere in setup does not count;
  const deepCopy = /=\s*(?:ref|reactive)\s*\(\s*[^)\n]*todos/.test(content);
  // deeply-reactive useState container is also a legitimate fix.
  const deepState = /useState\s*(?:<[^>]*>)?\s*\(/.test(content);

  expect(optsDeep || reassigns || triggers || deepCopy || deepState).toBe(true);
});

test('Still renders the todo list with a checkbox toggle', () => {
  const content = getPageContent();
  expect(content).toMatch(/v-for/);
  expect(content).toMatch(/checkbox/);
  expect(content).toMatch(/@change|@click|v-model/);
});
