/**
 * Custom $fetch client
 *
 * The starter plugin "adds" an auth header by assigning
 * `globalThis.$fetch = $fetch.create({ onRequest })`. Verified on nuxt@4.6.4
 * with a real build: the auto-imported `$fetch` and the one `useFetch` uses
 * both come from `#build/fetch`, which snapshots `globalThis.$fetch` when the
 * module loads (`export const $fetch = globalThis.$fetch`), before any plugin
 * runs. So the override is a silent no-op. With a `token` cookie, the SSR
 * dashboard renders "Could not load your account." and a client-side
 * `$fetch('/api/profile', { method: 'PATCH' })` goes out with no
 * Authorization header. On the server it is also a cross-request leak: the
 * plugin runs per request and rewrites a process-wide global with a closure
 * over that request's cookie.
 *
 * The documented fix (guide/recipes/custom-usefetch) is a `$fetch.create`
 * instance provided by a plugin, used directly or through `createUseFetch`.
 * Accepted shapes, each built and checked on 4.6.4 (SSR dashboard renders the
 * account, the browser PATCH carries the header):
 *   - plugin provides `$api`, call sites use `useNuxtApp().$api` /
 *     `useAsyncData(() => $api(...))`
 *   - `createUseFetch(callerOptions => ({ $fetch: useNuxtApp().$api }))`
 *   - `createUseFetch({ onRequest() { useCookie('token') ... } })`
 *   - a wrapper composable passing `$fetch: useNuxtApp().$api` to `useFetch`
 *     (the pre-4.5 recipe)
 *   - `useFetch(url, { $fetch: $api })` at each call site
 *   - a module-scope `export const api = $fetch.create(...)` in `app/utils`
 *     that reads `useCookie` inside `onRequest`
 *
 * Rejected, because they build fine and still break:
 *   - any reassignment of the global `$fetch`, or aliasing `#build/fetch`
 *   - `createUseFetch({ $fetch: useNuxtApp().$api })` in object mode: runs
 *     `useNuxtApp()` at module scope, observed 500 NUXT_E1001 on SSR
 *   - the header baked into `$fetch.create({ headers })` at plugin setup: the
 *     prompt says the cookie changes on sign-in and sign-out
 *   - `ofetch` imported directly: loses Nuxt's baseURL and SSR direct calls
 *   - the header set per call site, or the server switched to cookies (the
 *     prompt rules both out)
 *
 * `createUseFetch` only exists from nuxt 4.5, hence `^4.5.0` in package.json.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const root = process.cwd();
const appDir = join(root, 'app');

type SourceFile = { path: string; content: string };

/** Drops HTML, block and line comments, leaving string literals intact. */
function stripComments(source: string): string {
  const input = source.replace(/<!--[\s\S]*?-->/g, '');
  let out = '';
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < input.length && input[j] !== ch && !(ch !== '`' && input[j] === '\n')) {
        j += input[j] === '\\' ? 2 : 1;
      }
      out += input.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '/' && next === '*') {
      const end = input.indexOf('*/', i + 2);
      i = end === -1 ? input.length : end + 2;
    } else if (ch === '/' && next === '/') {
      while (i < input.length && input[i] !== '\n') i++;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function sourceFiles(dir: string): SourceFile[] {
  if (!existsSync(dir)) return [];
  const out: SourceFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(vue|ts|js|mjs|mts)$/.test(entry.name)) {
      out.push({ path: relative(root, full), content: stripComments(readFileSync(full, 'utf-8')) });
    }
  }
  return out;
}

function readFile(path: string): SourceFile | undefined {
  const full = join(root, path);
  if (!existsSync(full)) return undefined;
  return { path, content: stripComments(readFileSync(full, 'utf-8')) };
}

const appFiles = sourceFiles(appDir);

const isPlugin = (f: SourceFile) => /^app[\\/]plugins[\\/]/.test(f.path);
const isCallSite = (f: SourceFile) =>
  /^app[\\/](pages|components|layouts|middleware)[\\/]/.test(f.path)
  || /^app[\\/](app|error)\.vue$/.test(f.path);
const isMiddleware = (f: SourceFile) => /^app[\\/]middleware[\\/]/.test(f.path);
/** Composables, utils, or any other module a call site can import. */
const isReusable = (f: SourceFile) => !isPlugin(f) && !isCallSite(f);

const callSites = appFiles.filter(isCallSite);

function indexPage(): SourceFile {
  const f = appFiles.find(f => /^app[\\/]pages[\\/]index\.vue$/.test(f.path));
  if (!f) throw new Error('app/pages/index.vue is gone');
  return f;
}

function profileForm(): SourceFile {
  const f = appFiles.find(f => /ProfileForm\.vue$/.test(f.path));
  if (!f) throw new Error('the ProfileForm component is gone');
  return f;
}

/** Argument source of every call matched by `callee`, with balanced brackets. */
function callArgs(source: string, callee: RegExp): string[] {
  const re = new RegExp(callee.source + /\s*(?:<[^>()]*>)?\s*\(/.source, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let i = m.index + m[0].length;
    const start = i;
    let depth = 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        i++;
        while (i < source.length && source[i] !== quote) i += source[i] === '\\' ? 2 : 1;
      } else if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      i++;
    }
    out.push(source.slice(start, i - 1));
  }
  return out;
}

/** Built into the Nuxt app, not provided by the project's plugins. */
const BUILT_IN_PROVIDES = new Set(['config', 'router', 'nuxt', 'head', 'route', 'ssrContext', 'payload']);

/** `$name`s read off `useNuxtApp()`: destructured, chained, or through a variable. */
function nuxtAppProps(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(/\{([^{}]*)\}\s*=\s*useNuxtApp\s*\(\s*\)/g)) {
    for (const n of m[1].matchAll(/\$(\w+)/g)) names.add(n[1]);
  }
  for (const m of source.matchAll(/useNuxtApp\s*\(\s*\)\s*\.\s*\$(\w+)/g)) names.add(m[1]);
  for (const m of source.matchAll(/(?<![\w$])([A-Za-z_$][\w$]*)\s*=\s*useNuxtApp\s*\(\s*\)(?!\s*\.)/g)) {
    const v = m[1].replace(/\$/g, '\\$');
    for (const n of source.matchAll(new RegExp(`(?<![\\w$.])${v}\\s*\\.\\s*\\$(\\w+)`, 'g'))) names.add(n[1]);
  }
  return [...names].filter(n => !BUILT_IN_PROVIDES.has(n));
}

/** Keys a plugin provides: `return { provide: { a, b: x } }` or `nuxtApp.provide('a', x)`. */
function providedNames(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(/\.\s*provide\s*\(\s*['"`]([\w$]+)['"`]/g)) names.add(m[1]);
  for (const m of source.matchAll(/(?<![\w$.])provide\s*:\s*\{/g)) {
    let i = m.index! + m[0].length;
    let depth = 1;
    let entry = '';
    const entries: string[] = [];
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      if (depth === 1 && ch === ',') { entries.push(entry); entry = ''; }
      else if (depth > 0 && !(depth === 1 && ch === ',')) entry += ch;
      i++;
    }
    entries.push(entry);
    for (const e of entries) {
      const key = e.trim().match(/^['"`]?([A-Za-z_$][\w$]*)['"`]?\s*(?::|\(|$)/);
      if (key) names.add(key[1]);
    }
  }
  return [...names];
}

/** Names a module exports, including the filename Nuxt auto-imports a default export under. */
function exportedNames(f: SourceFile): string[] {
  const names = [...f.content.matchAll(/export\s+(?:const|let|function|async\s+function)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
  for (const m of f.content.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.push(name);
    }
  }
  if (/export\s+default\b/.test(f.content)) {
    const base = f.path.split(/[\\/]/).pop()!.replace(/\.\w+$/, '');
    names.push(base, base.replace(/[-.](\w)/g, (_, c: string) => c.toUpperCase()));
  }
  return names;
}

const callsName = (source: string, name: string) =>
  new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\s*(?:<[^>()]*>)?\\s*\\(`).test(source);

const CLIENT_MARKER = /\$fetch\s*\.\s*create\s*\(|(?<![\w$])createUseFetch\s*[<(]/;
const FUNCTION_MODE = /(?<![\w$])createUseFetch\s*(?:<[^>()]*>)?\s*\(\s*(?:async\s*)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*=>|(?<![\w$])createUseFetch\s*(?:<[^>()]*>)?\s*\(\s*(?:async\s+)?function\b/;
const BARE_DOLLAR_FETCH = /(?<![\w$.])\$fetch\s*(?:<[^>()]*>)?\s*\(/;

test('Nothing reassigns the global $fetch', () => {
  const files = [
    ...appFiles,
    ...sourceFiles(join(root, 'server')),
    ...sourceFiles(join(root, 'shared')),
    ...sourceFiles(join(root, 'modules')),
    ...sourceFiles(join(root, 'layers')),
    ...['nuxt.config.ts', 'app.config.ts'].map(readFile).filter((f): f is SourceFile => !!f)
  ];

  const patterns = [
    /(?<![\w$])(?:globalThis|window|global|self)\s*(?:\.\s*\$fetch|\[\s*['"`]\$fetch['"`]\s*\])\s*(?:=(?!=)|\?\?=|\|\|=)/,
    /(?<![\w$.])(?<!typeof\s+)\$fetch\s*=(?!=)/,
    /Object\s*\.\s*(?:defineProperty|assign)\s*\(\s*(?:globalThis|window|global|self)\b[^)]*\$fetch/,
    /#build\/fetch/
  ];

  const offenders = files.filter(f => patterns.some(re => re.test(f.content))).map(f => f.path);

  expect(
    offenders,
    `the global $fetch is not configurable, \`useFetch\` and \`$fetch\` never see the override: ${offenders.join(', ')}`
  ).toEqual([]);
});

test('server/ is untouched', () => {
  const normalize = (s: string) => stripComments(s).replace(/\s+|;/g, '').replace(/"/g, "'");
  const expected: Record<string, string> = {
    'server/api/me.get.ts': `export default defineEventHandler((event) => {
      const token = requireToken(event)
      return { id: 'u_1', name: 'Ada Lovelace', token: token.slice(0, 4) }
    })`,
    'server/api/orders.get.ts': `export default defineEventHandler((event) => {
      requireToken(event)
      return [
        { id: 1042, total: 129 },
        { id: 1043, total: 54 },
        { id: 1044, total: 310 }
      ]
    })`,
    'server/api/profile.patch.ts': `export default defineEventHandler(async (event) => {
      requireToken(event)
      const body = await readBody<{ name?: string }>(event)
      if (!body?.name) {
        throw createError({ statusCode: 400, statusMessage: 'Name is required' })
      }
      return { name: body.name }
    })`,
    'server/utils/auth.ts': `import type { H3Event } from 'h3'
    export function requireToken(event: H3Event): string {
      const header = getRequestHeader(event, 'authorization')
      if (!header?.startsWith('Bearer ')) {
        throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })
      }
      return header.slice('Bearer '.length)
    }`
  };

  // Test files an agent adds next to the routes don't change what the API accepts.
  const actual = sourceFiles(join(root, 'server'))
    .map(f => f.path.replace(/\\/g, '/'))
    .filter(p => !/\.(test|spec)\.\w+$/.test(p))
    .sort();
  expect(actual, 'files were added to or removed from server/').toEqual(Object.keys(expected).sort());

  for (const [path, source] of Object.entries(expected)) {
    const current = readFileSync(join(root, path), 'utf-8');
    expect(normalize(current), `${path} was changed`).toBe(normalize(source));
  }
});

test('The header is attached by one Nuxt $fetch client, per request', () => {
  const nonCallSites = appFiles.filter(f => !isCallSite(f));

  expect(
    appFiles.some(f => /(?<![\w$])from\s*['"]ofetch['"]|require\(\s*['"]ofetch['"]\s*\)/.test(f.content)),
    'build on Nuxt\'s `$fetch.create`, a bare ofetch instance loses the baseURL and SSR direct calls'
  ).toBe(false);

  const perCallSite = callSites.filter(f => /authorization/i.test(f.content)).map(f => f.path);
  expect(perCallSite, `the header must be attached in one place, not per call site: ${perCallSite.join(', ')}`).toEqual([]);

  // `options.headers` is a `Headers` instance in ofetch, so assigning a
  // property on it is silently dropped.
  const propertyHeader = nonCallSites
    .filter(f => /\.headers\s*(?:\.\s*authorization|\[\s*['"`]authorization['"`]\s*\])\s*=(?!=)/i.test(f.content))
    .map(f => f.path);
  expect(propertyHeader, `\`options.headers\` is a Headers instance, a property assignment never reaches the request; use \`.set()\`: ${propertyHeader.join(', ')}`).toEqual([]);

  const clients = nonCallSites.filter(f => CLIENT_MARKER.test(f.content));
  expect(clients.length, 'no `$fetch.create` or `createUseFetch` client').toBeGreaterThan(0);
  expect(
    nonCallSites.some(f => /authorization/i.test(f.content)),
    'no plugin or composable attaches the Authorization header'
  ).toBe(true);
  expect(nonCallSites.some(f => /Bearer/.test(f.content)), 'the client must send a bearer token').toBe(true);

  const headerClients = clients.filter(f => /authorization/i.test(f.content));
  for (const f of headerClients.length > 0 ? headerClients : clients) {
    expect(
      /\bonRequest\b/.test(f.content) || FUNCTION_MODE.test(f.content),
      `${f.path} reads the token once at setup; it changes on sign-in and sign-out, so read it per request in \`onRequest\``
    ).toBe(true);
    const firstHook = f.content.search(/\bonRequest\b/);
    const snapshot = f.content.search(/useCookie\s*(?:<[^>()]*>)?\s*\([^)]*\)\s*\.value/);
    expect(
      firstHook !== -1 && snapshot !== -1 && snapshot < firstHook && !FUNCTION_MODE.test(f.content),
      `${f.path} copies the cookie value at setup, so the header goes stale after sign-in; keep the \`useCookie\` ref and read \`.value\` per request`
    ).toBe(false);
  }

  // `runWithContext` returns a Promise on the server; assigning it without
  // awaiting leaves the token undefined during SSR.
  const unawaited = nonCallSites
    .filter(f => /=\s*[A-Za-z_$][\w$]*\s*\.\s*runWithContext\s*\(/.test(f.content))
    .map(f => f.path);
  expect(unawaited, `\`runWithContext\` returns a Promise during SSR, await it: ${unawaited.join(', ')}`).toEqual([]);

  const readsTokenCookie =
    nonCallSites.some(f => /useCookie\s*(?:<[^>()]*>)?\s*\(\s*['"`]token['"`]/.test(f.content))
    || (nonCallSites.some(f => /useCookie\s*(?:<[^>()]*>)?\s*\(\s*[A-Za-z_$][\w$.]*\s*[,)]/.test(f.content))
      && nonCallSites.some(f => /['"`]token['"`]/.test(f.content)));
  expect(readsTokenCookie, 'the client must read the `token` cookie with useCookie').toBe(true);
  expect(
    callSites.filter(f => !isMiddleware(f)).some(f => /useCookie\s*(?:<[^>()]*>)?\s*\(\s*['"`]token['"`]/.test(f.content)),
    'call sites should not read the token themselves'
  ).toBe(false);
});

test('Pages and components call the API through the client', () => {
  const reusable = appFiles.filter(isReusable);

  // Modules that expose the authenticated client, directly or by wrapping
  // another one, and the names they export.
  const clientFiles = new Set(reusable.filter(f =>
    CLIENT_MARKER.test(f.content) || /\$fetch\s*:/.test(f.content) || nuxtAppProps(f.content).length > 0
  ));
  for (let grew = true; grew;) {
    grew = false;
    const names = [...clientFiles].flatMap(exportedNames);
    for (const f of reusable) {
      if (!clientFiles.has(f) && names.some(n => callsName(f.content, n))) {
        clientFiles.add(f);
        grew = true;
      }
    }
  }
  const clientNames = [...clientFiles].flatMap(exportedNames);
  const providedAnywhere = new Set(appFiles.filter(isPlugin).flatMap(p => providedNames(p.content)));

  /** A `$fetch:` option that points at the authenticated client, not another fetcher. */
  const isClientRef = (args: string) => {
    const value = args.match(/\$fetch\s*:\s*([^,}\n]+)/)?.[1] ?? '';
    return /useNuxtApp\s*\(/.test(value)
      || [...value.matchAll(/\$([A-Za-z_]\w*)/g)].some(m => m[1] !== 'fetch' && (providedAnywhere.has(m[1]) || !BUILT_IN_PROVIDES.has(m[1])))
      || clientNames.some(n => new RegExp(`(?<![\\w$.])${n.replace(/\$/g, '\\$')}(?![\\w$])`).test(value));
  };

  for (const f of callSites) {
    expect(BARE_DOLLAR_FETCH.test(f.content), `${f.path} still calls the bare \`$fetch\`, which never gets the header`).toBe(false);

    for (const args of callArgs(f.content, /(?<![\w$.])use(?:Lazy)?Fetch/)) {
      expect(isClientRef(args), `${f.path} calls \`useFetch\` without the custom client: useFetch(${args.slice(0, 60)})`).toBe(true);
    }
  }

  const usesClient = (f: SourceFile) =>
    nuxtAppProps(f.content).length > 0
    || clientNames.some(n => callsName(f.content, n))
    || callArgs(f.content, /(?<![\w$.])use(?:Lazy)?Fetch/).some(isClientRef);

  /** The page plus the modules it calls into, where its endpoints may live. */
  const withHelpers = (f: SourceFile) =>
    [f, ...reusable.filter(r => exportedNames(r).some(n => callsName(f.content, n)))].map(x => x.content).join('\n');

  const index = indexPage();
  expect(usesClient(index), 'the dashboard no longer fetches through the authenticated client').toBe(true);
  expect(withHelpers(index), 'the dashboard must still load the account').toMatch(/['"`](?:\/api)?\/me['"`?]/);
  expect(withHelpers(index), 'the dashboard must still load the orders').toMatch(/['"`](?:\/api)?\/orders['"`?]/);
  expect(index.content, 'keep the dashboard data server-rendered').not.toMatch(/\bonMounted\b|\bserver\s*:\s*false/);

  const form = profileForm();
  expect(usesClient(form), 'the profile form no longer saves through the authenticated client').toBe(true);
  expect(withHelpers(form), 'the profile form must still PATCH /profile').toMatch(/['"`](?:\/api)?\/profile['"`?]/);
  expect(withHelpers(form)).toMatch(/method\s*:\s*['"`]patch['"`]/i);
});

test('The client is resolved inside the Nuxt context', () => {
  const plugins = appFiles.filter(isPlugin);
  const used = [...new Set(appFiles.filter(f => !isPlugin(f)).flatMap(f => nuxtAppProps(f.content)))];

  const provides = (p: SourceFile, name: string) => providedNames(p.content).includes(name);

  const missing = used.filter(name => !plugins.some(p => provides(p, name)));
  expect(missing.map(n => `$${n}`), 'read off useNuxtApp() but no plugin provides it').toEqual([]);

  // The dashboard fetches during SSR, so a client-only plugin leaves `$api`
  // undefined on the server.
  const clientOnly = plugins
    .filter(p => used.some(name => provides(p, name)))
    .filter(p => /\.client\.\w+$/.test(p.path) || /\bmode\s*:\s*['"`]client['"`]/.test(p.content))
    .map(p => p.path);
  expect(clientOnly, `the client is used during SSR but only provided in the browser: ${clientOnly.join(', ')}`).toEqual([]);

  // The profile form saves from the browser, so a server-only plugin leaves
  // `$api` undefined there.
  const serverOnly = plugins
    .filter(p => used.some(name => provides(p, name)))
    .filter(p => /\.server\.\w+$/.test(p.path))
    .map(p => p.path);
  expect(serverOnly, `the client is used in the browser but only provided on the server: ${serverOnly.join(', ')}`).toEqual([]);

  for (const f of appFiles.filter(isReusable)) {
    expect(
      /^(?:export\s+)?(?:const|let|var)\s+[^=\n]+=\s*(?:useNuxtApp|useCookie)\s*\(/m.test(f.content),
      `${f.path} calls a Nuxt composable at module scope, where there is no Nuxt instance`
    ).toBe(false);

    const objectMode = callArgs(f.content, /(?<![\w$])createUseFetch/).filter(a => /^\s*\{/.test(a));
    expect(
      objectMode.some(a => /\$fetch\s*:\s*(?!\(|async\b|function\b)[^,}\n]*\buse[A-Z]\w*\s*\(/.test(a)),
      `${f.path} calls a composable in createUseFetch's object mode, which runs it at module scope; use the function signature`
    ).toBe(false);
  }
});
