/**
 * Shallow reactivity of useFetch/useAsyncData data (Nuxt 4 default)
 *
 * Since Nuxt 4, `data` from useFetch/useAsyncData is a `shallowRef`, not a deep
 * `ref`. Deep-mutating a nested field (`todo.done = !todo.done`) therefore does
 * NOT trigger a re-render — the starter's checkbox only updates on refresh.
 *
 * Valid fixes make the change reactive: opt into deep reactivity with
 * `{ deep: true }`, reassign the ref immutably (`todos.value = todos.value.map(...)`),
 * call `triggerRef(todos)`, or hold the list in a deep `ref`/`reactive` copy.
 *
 * Wrong-prior: Nuxt-3 muscle memory assumes `data` is deeply reactive, so a
 * naive nested mutation "should" work. The prompt gives only the symptom.
 * https://nuxt.com/docs/4.x/getting-started/upgrade  (Shallow Data Reactivity)
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function getPageContent(): string {
  const p = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ].find(existsSync);
  if (!p) throw new Error('No page found');
  return readFileSync(p, 'utf-8');
}

test('Still fetches the todos with a Nuxt data primitive', () => {
  const content = getPageContent();
  expect(content).toMatch(/useFetch|useAsyncData/);
  expect(content).toMatch(/\/api\/todos/);
});

test('Makes the toggle reactive despite the shallowRef default', () => {
  const content = getPageContent();

  // Any of the valid strategies for updating a shallowRef reactively:
  const optsDeep = /deep\s*:\s*true/.test(content);        // useFetch(..., { deep: true })
  const reassigns = /\.value\s*=/.test(content);           // immutable replacement
  const triggers = /triggerRef\s*\(/.test(content);        // manual trigger
  const deepCopy = /=\s*(?:ref|reactive)\s*\(/.test(content); // local deep ref/reactive copy

  expect(optsDeep || reassigns || triggers || deepCopy).toBe(true);
});

test('Still renders the todo list with a checkbox toggle', () => {
  const content = getPageContent();
  expect(content).toMatch(/v-for/);
  expect(content).toMatch(/checkbox/);
  expect(content).toMatch(/@change|@click|v-model/);
});
