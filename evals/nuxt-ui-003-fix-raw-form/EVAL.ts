/**
 * Fix Raw HTML Form with Nuxt UI Components
 *
 * Tests whether the agent replaces a raw HTML form with manual validation
 * with Nuxt UI's UForm + UFormField + UInput components, wired so that UForm
 * owns validation and error display. Verified on @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * UForm validates either through `:schema` (Zod is installed) or through the
 * documented `:validate` prop returning FormError[] ("Custom validation" in the
 * Form docs). The prompt only says to keep the same rules, so both pass. What
 * fails is keeping the old plumbing: assigning into an `errors` ref and
 * rendering `<p v-if="errors.x">` by hand.
 *
 * Checks and why:
 * - `<UForm>` binds `:state` and `:schema` or `:validate`: without one of them
 *   UForm never validates.
 * - Every UFormField has `name="email"` / `name="password"`: FormField finds
 *   its error by `error.name === props.name`, so without `name` no error is
 *   ever shown even though validation runs.
 * - The rules survive: the script still has the 8 character minimum and an
 *   email check (`z.email()`, `.email()`, `.regex()` or `.test()`). This stops
 *   a schema like `z.object({ email: z.string() })` that drops the rules.
 * - State is one object (`reactive({...})` or `ref({...})`), not one ref per
 *   field, since UForm takes a single `state` object.
 * - No raw `<form>` / `<input>`, and the page uses UButton.
 *
 * Comments are stripped before matching. Opening tags are read with a small
 * quote-aware scanner so an arrow function such as `@submit="(e) => go(e)"`
 * inside an attribute does not end the tag early.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function stripComments(source: string): string {
  // Block and line comments only count when they start a line or follow
  // whitespace, so glob strings ('team/*.json') and URLs survive.
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function getFormPageContent(): string {
  const candidates = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'login.vue'),
    join(process.cwd(), 'app', 'pages', 'login', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return stripComments(readFileSync(candidate, 'utf-8'));
    }
  }

  throw new Error('No form page found');
}

function getScript(content: string): string {
  return [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
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

function hasAttribute(attributes: string, name: string): boolean {
  // Also matches the Vue 3.4 same-name shorthand (`:state` for `:state="state"`).
  return new RegExp(`(^|\\s)(:|v-bind:)${name}(\\s*=|(?=[\\s/>]|$))`).test(attributes);
}

test('Uses UForm component', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/<UForm[\s>]/);
});

test('UForm binds :state and validates with :schema or :validate', () => {
  const forms = getOpeningTags(getFormPageContent(), 'UForm');

  expect(forms.length).toBeGreaterThan(0);
  expect(forms.some(attrs =>
    hasAttribute(attrs, 'state') && (hasAttribute(attrs, 'schema') || hasAttribute(attrs, 'validate')),
  )).toBe(true);
});

test('UForm has @submit handler', () => {
  const forms = getOpeningTags(getFormPageContent(), 'UForm');
  expect(forms.some(attrs => /(^|\s)(@|v-on:)submit\b/.test(attrs))).toBe(true);
});

test('Uses UFormField for form fields', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/<UFormField[\s>]/);
});

test('UFormField name props route errors to each field', () => {
  const fields = getOpeningTags(getFormPageContent(), 'UFormField');

  expect(fields.some(attrs => /(^|\s)name\s*=\s*["']email["']/.test(attrs))).toBe(true);
  expect(fields.some(attrs => /(^|\s)name\s*=\s*["']password["']/.test(attrs))).toBe(true);
});

test('Uses UInput instead of raw input', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/<UInput[\s>/]/);
});

test('No raw HTML form elements', () => {
  const content = getFormPageContent();
  expect(content).not.toMatch(/<form[\s>]/);
  expect(content).not.toMatch(/<input[\s>]/);
});

test('No manual error plumbing', () => {
  const content = getFormPageContent();
  // UForm collects and displays errors; the agent must not keep writing into
  // an errors ref or rendering error paragraphs by hand.
  expect(content).not.toMatch(/errors\.value\.\w+\s*=/);
  expect(content).not.toMatch(/v-if=["']\s*errors\./);
});

test('Keeps the validation rules', () => {
  const script = getScript(getFormPageContent());

  // Password minimum length and an email format check must survive.
  expect(script).toMatch(/\b8\b/);
  expect(script).toMatch(/z\.email\(|\.email\(|\.regex\(|\.test\(/);
});

test('Uses one state object (not individual refs)', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/\b(reactive|ref)\s*(<[^(]*>)?\s*\(\s*\{/);
  expect(content).not.toMatch(/const\s+(email|password)\s*=\s*ref\s*(<[^(]*>)?\s*\(/);
});

test('Has email and password fields', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/email/i);
  expect(content).toMatch(/password/i);
});

test('Uses UButton for submit', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/<UButton[\s>/]/);
});
