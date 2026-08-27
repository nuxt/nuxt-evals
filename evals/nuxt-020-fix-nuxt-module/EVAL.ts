/**
 * Fix a local Nuxt module (module authoring)
 *
 * The app ships a local `beacon` analytics module written against the module
 * author guide (module-anatomy, recipes-basics, best-practices,
 * module-dependencies). Every planted defect is silent at build time, so the
 * agent has to know module authoring rather than read an error:
 *
 *   - No `meta`, so `configKey ||= name` never yields a key and the user's
 *     `beacon` block in nuxt.config.ts is silently dropped.
 *   - Unprefixed public surface: `addComponent({ name: 'Chart' })` collides
 *     with the app's scanned Chart.vue and silently loses (the scanned
 *     component wins, no warning), while the `/api/track` server handler wins
 *     over the app's own route (last registration wins in h3). Both observed
 *     on a real nuxt@4.5.2 build of this fixture.
 *   - `nuxt.options.css = [...]` and `runtimeConfig.public.beacon = {...}`
 *     overwrite user values instead of merging.
 *   - Every kit path argument is a root-anchored `~~/modules/beacon/...`
 *     literal instead of resolving relative to the module.
 *   - `modules/beacon/consent.ts` never loads: Nuxt only auto-scans
 *     `modules/*` and `modules/* /index`, so a sub-module must be declared via
 *     `moduleDependencies`. Observed on nuxt@4.5.2: with the declaration the
 *     consent config is baked into .output, without it it is absent and the
 *     build stays green.
 *
 * Static analysis policy: values are read as string literals, interpolation-
 * free template literals, or one const-lookup hop away (including resolver /
 * new URL wrappers). The recipes guide requires kit calls to be statically
 * analyzable, so a name, route, or dependency key that cannot be resolved
 * statically fails the check rather than being skipped — a skipped check is
 * how a planted defect survives a passing run.
 *
 * Deliberately NOT tested (do not re-add without a reason):
 *   - `meta.compatibility`: its value is arbitrary, requiring mere presence is
 *     noise.
 *   - The `runtime/app/` directory layout: the docs themselves mix
 *     `runtime/app/components` and `./runtime/style.css` on one page.
 *   - A `version` range in moduleDependencies: kit throws at build when the
 *     range misses the installed version, which turns a version-string guess
 *     into a full-eval zero. (Version ranges are not even enforced for local
 *     modules, which resolve without a package.json.)
 *   - Explicit imports in runtime files: auto-imports genuinely work for local
 *     modules (disabled only under node_modules), so requiring `#imports`
 *     would reject a working, documented setup.
 *   - `__dirname`-based resolution: it happens to work through the jiti
 *     fallback, but the documented module-relative forms are
 *     `createResolver(import.meta.url | import.meta.dirname)` and
 *     `new URL(..., import.meta.url)`; both are accepted, CJS globals are not.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative, sep } from 'path';

const root = process.cwd();

/**
 * Comment stripper that tracks string state, so `/*` inside a string (e.g. a
 * glob pattern like '**' + '/*.vue') never opens a phantom comment.
 */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  let mode: 'code' | 'line' | 'block' | "'" | '"' | '`' = 'code';
  while (i < source.length) {
    const c = source[i]!;
    const next = source[i + 1];
    if (mode === 'code') {
      if (c === '/' && next === '/') { mode = 'line'; i += 2; continue; }
      if (c === '/' && next === '*') { mode = 'block'; i += 2; continue; }
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4);
        i = end === -1 ? source.length : end + 3;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') mode = c;
      out += c;
      i++;
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += c; }
      i++;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && next === '/') { mode = 'code'; i += 2; }
      else i++;
      continue;
    }
    // inside a string
    if (c === '\\') { out += c + (next ?? ''); i += 2; continue; }
    if (c === mode) mode = 'code';
    out += c;
    i++;
  }
  return out;
}

interface SourceFile {
  rel: string;
  content: string;
}

function sourceFiles(dir: string): SourceFile[] {
  if (!existsSync(dir)) return [];
  const out: SourceFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(vue|ts|js|mts|mjs|css)$/.test(entry.name)) {
      out.push({
        rel: relative(root, full).split(sep).join('/'),
        content: stripComments(readFileSync(full, 'utf-8'))
      });
    }
  }
  return out;
}

function read(rel: string, missing: string): string {
  const full = join(root, rel);
  if (!existsSync(full)) throw new Error(missing);
  return stripComments(readFileSync(full, 'utf-8'));
}

const OPEN = '([{';
const CLOSE = ')]}';
const QUOTES = "'\"`";

/** Argument text of every `fn(...)` call, bracket- and string-aware. */
function callArgs(source: string, fnPattern: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\b${fnPattern}\\s*\\(`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 1;
    let quote: string | null = null;
    for (let i = m.index + m[0].length; i < source.length; i++) {
      const c = source[i]!;
      if (quote) {
        if (c === '\\') i++;
        else if (c === quote) quote = null;
        continue;
      }
      if (QUOTES.includes(c)) quote = c;
      else if (OPEN.includes(c)) depth++;
      else if (CLOSE.includes(c) && --depth === 0) {
        out.push(source.slice(m.index + m[0].length, i));
        break;
      }
    }
  }
  return out;
}

interface Assignment {
  lhs: string;
  rhs: string;
}

/**
 * Every plain `lhs = rhs` statement whose LHS matches the pattern. `||=`,
 * `??=`, `==`, `=>` do not match. Leading whitespace (including a line break
 * after `=`) is skipped before the RHS is captured, so wrapped assignments
 * parse the same as single-line ones.
 */
function assignments(source: string, lhsPattern: string): Assignment[] {
  const out: Assignment[] = [];
  const re = new RegExp(`(${lhsPattern})\\s*=(?![=>])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let i = m.index + m[0].length;
    while (i < source.length && /\s/.test(source[i]!)) i++;
    const start = i;
    let depth = 0;
    let quote: string | null = null;
    for (; i < source.length; i++) {
      const c = source[i]!;
      if (quote) {
        if (c === '\\') i++;
        else if (c === quote) quote = null;
        continue;
      }
      if (QUOTES.includes(c)) quote = c;
      else if (OPEN.includes(c)) depth++;
      else if (CLOSE.includes(c)) {
        if (depth === 0) break;
        depth--;
      } else if (depth === 0 && (c === '\n' || c === ';')) break;
    }
    out.push({ lhs: m[1]!, rhs: source.slice(start, i).trim() });
  }
  return out;
}

/**
 * Value text of a DIRECT (depth-1) property of an object literal. Nested
 * occurrences of the key (e.g. inside `meta`) are not returned, which matters:
 * Nuxt only honors `moduleDependencies` as a top-level definition property.
 */
function propAtDepth1(objText: string, key: string): string | undefined {
  const text = objText.trim();
  if (!text.startsWith('{')) return undefined;
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (QUOTES.includes(c)) { quote = c; continue; }
    if (OPEN.includes(c)) { depth++; continue; }
    if (CLOSE.includes(c)) { depth--; continue; }
    if (depth !== 1 || !text.startsWith(key, i)) continue;
    if (/[\w$]/.test(text[i - 1] ?? '')) continue;
    const after = /^\s*:/.exec(text.slice(i + key.length));
    if (!after) continue;
    let j = i + key.length + after[0].length;
    let d = 0;
    let q: string | null = null;
    for (; j < text.length; j++) {
      const ch = text[j]!;
      if (q) {
        if (ch === '\\') j++;
        else if (ch === q) q = null;
        continue;
      }
      if (QUOTES.includes(ch)) q = ch;
      else if (OPEN.includes(ch)) d++;
      else if (CLOSE.includes(ch)) {
        if (d === 0) break;
        d--;
      } else if (d === 0 && ch === ',') break;
    }
    return text.slice(i + key.length + after[0].length, j).trim();
  }
  return undefined;
}

/**
 * `propAtDepth1`, but `{ route }` shorthand resolves to the identifier `route`,
 * which the caller then resolves like any other expression.
 */
function prop(objText: string, key: string): string | undefined {
  const direct = propAtDepth1(objText, key);
  if (direct !== undefined) return direct;
  return new RegExp(`\\{[^{}]*\\b${key}\\s*[,}]`).test(objText) ? key : undefined;
}

/** A quoted string with no interpolation, or undefined. */
function literalValue(text: string): string | undefined {
  const t = text.trim();
  const m = /^['"]([^'"\n]*)['"]$/.exec(t) ?? /^`([^`$\n]*)`$/.exec(t);
  return m?.[1];
}

/**
 * Statically resolve an expression to a string: a literal, a one-hop const
 * lookup in the same file, or the first argument of a resolver-style wrapper
 * (`resolver.resolve('./x')`, `resolve('./x')`, `new URL('./x', ...)`,
 * `fileURLToPath(new URL('./x', ...))`).
 */
function resolveString(scope: string, expr: string, hops = 3): string | undefined {
  if (hops === 0) return undefined;
  const t = expr.trim();
  const lit = literalValue(t);
  if (lit !== undefined) return lit;
  const call = /^(?:new\s+URL|[\w$]+(?:\.[\w$]+)*)\s*\(([\s\S]*)\)$/.exec(t);
  if (call) {
    const firstArg = call[1]!.split(',')[0]!;
    return resolveString(scope, firstArg, hops - 1);
  }
  if (/^[\w$]+$/.test(t)) {
    const decl = new RegExp(`\\b(?:const|let|var)\\s+${t}\\s*=\\s*([^\\n;]+)`).exec(scope);
    if (decl) return resolveString(scope, decl[1]!, hops - 1);
  }
  // `options.endpoint` — driving a registration from a module option is good
  // practice (the handler and the composable stay in sync), so resolve it
  // through the module's own `defaults`, which is the value kit will pass in
  const option = /^([\w$]+)\.([\w$]+)$/.exec(t);
  if (option) {
    const { params, defaults } = optionContext();
    const value = params.has(option[1]!) ? defaults.get(option[2]!) : undefined;
    if (value !== undefined) return resolveString(scope, value, hops - 1);
  }
  return undefined;
}

let optionCtx: { params: Set<string>, defaults: Map<string, string> } | undefined;

/** Setup's options parameter names, and the module's declared option defaults. */
function optionContext(): { params: Set<string>, defaults: Map<string, string> } {
  if (optionCtx) return optionCtx;
  const params = new Set<string>();
  const defaults = new Map<string, string>();
  for (const f of moduleFiles) {
    for (const m of f.content.matchAll(/\bsetup\s*(?::\s*)?(?:async\s*)?\(\s*([\w$]+)/g)) params.add(m[1]!);
    for (const m of f.content.matchAll(/\(\s*([\w$]+)\s*[,:][^)]*\bnuxt\b/g)) params.add(m[1]!);
  }
  for (const f of entryFiles) {
    for (const def of definitionObjects(f.content)) {
      const block = propAtDepth1(def, 'defaults');
      if (!block) continue;
      for (const m of block.matchAll(/([\w$]+)\s*:\s*([^,\n}]+)/g)) {
        if (!defaults.has(m[1]!)) defaults.set(m[1]!, m[2]!.trim());
      }
    }
  }
  optionCtx = { params, defaults };
  return optionCtx;
}

/** One-hop expansion of identifiers in `text` with their const initializers. */
function expanded(scope: string, text: string): string {
  let out = text;
  for (const id of new Set(text.match(/\b[a-zA-Z_$][\w$]*\b/g) ?? [])) {
    const decl = new RegExp(`\\b(?:const|let|var)\\s+${id}\\s*=\\s*([^\\n;]+)`).exec(scope);
    if (decl) out += `\n${decl[1]}`;
  }
  return out;
}

const moduleFiles = sourceFiles(join(root, 'modules'));
const moduleTree = moduleFiles.map(f => f.content).join('\n');
const entryFiles = moduleFiles.filter(f => /\bdefineNuxtModule\b/.test(f.content));

const DEFINE_MODULE = 'defineNuxtModule\\s*(?:<[^>]*>)?';

/** Definition objects passed to defineNuxtModule in one file. */
function definitionObjects(content: string): string[] {
  return callArgs(content, DEFINE_MODULE)
    .map(a => a.trim())
    .filter(a => a.startsWith('{'));
}

/**
 * The config key kit computes (`configKey ?? name`), resolving literal
 * values, const identifiers, a `meta` defined as a separate const (shorthand),
 * and a single spread inside the meta object.
 */
function effectiveConfigKey(entry: SourceFile): string | undefined {
  for (const def of definitionObjects(entry.content)) {
    let meta = propAtDepth1(def, 'meta');
    if (meta === undefined && /\bmeta\s*[,}]/.test(def)) {
      const shorthand = assignments(entry.content, '(?:const|let|var)\\s+meta')[0];
      meta = shorthand?.rhs;
    }
    if (meta === undefined) continue;
    if (/^[\w$]+$/.test(meta)) {
      const decl = assignments(entry.content, `(?:const|let|var)\\s+${meta}`)[0];
      if (decl) meta = decl.rhs;
    }
    let metaText = meta;
    const spread = /\.\.\.\s*([\w$]+)/.exec(metaText);
    if (spread) {
      const decl = assignments(entry.content, `(?:const|let|var)\\s+${spread[1]}`)[0];
      if (decl) metaText += `\n${decl.rhs}`;
    }
    for (const key of ['configKey', 'name']) {
      const raw = new RegExp(`\\b${key}\\s*:\\s*([^,\\n}]+)`).exec(metaText)?.[1];
      if (raw) {
        const value = resolveString(entry.content, raw);
        if (value) return value;
      }
    }
  }
  return undefined;
}

const consentEntry = entryFiles.find((f) => {
  const key = effectiveConfigKey(f);
  if (key === 'beaconConsent' || key === 'beacon-consent') return true;
  return /runtimeConfig\.public\.beaconConsent\s*(?:\|\|=|\?\?=|=(?![=>]))/.test(f.content);
});
const beaconFiles = moduleFiles.filter(f => f !== consentEntry);
const beaconTree = beaconFiles.map(f => f.content).join('\n');
const beaconEntries = entryFiles.filter(f => f !== consentEntry);

function config(): string {
  return read('nuxt.config.ts', 'nuxt.config.ts is gone');
}

test('The beacon module still exists where Nuxt loads it from', () => {
  expect(beaconEntries.length, 'the beacon module is gone').toBeGreaterThan(0);

  const autoScanned = beaconEntries.some(f =>
    /^modules\/[^/]+\.(ts|js|mts|mjs)$/.test(f.rel)
    || /^modules\/[^/]+\/index\.(ts|js|mts|mjs)$/.test(f.rel)
  );
  const registered = /modules\s*:\s*\[[^\]]*['"`][^'"`]*modules\/[^'"`]*['"`]/.test(config());

  expect(
    autoScanned || registered,
    'Nuxt only auto-scans modules/* and modules/*/index — moving the entry elsewhere silently unregisters it'
  ).toBe(true);
});

test('The module declares its identity so the nuxt.config options reach setup', () => {
  const keys = beaconEntries.map(f => effectiveConfigKey(f)).filter(Boolean);
  expect(
    keys,
    'defineNuxtModule needs meta with a name/configKey matching the `beacon` block in nuxt.config.ts'
  ).toContain('beacon');
});

test('nuxt.config.ts still holds the user configuration', () => {
  const cfg = config();
  expect(cfg).toMatch(/beacon\s*:\s*\{[^}]*sampleRate\s*:\s*0\.25/);
  expect(cfg).toMatch(/main\.css/);
  expect(cfg).toMatch(/siteId\s*:\s*['"]nuxt-evals-demo['"]/);
});

test('The module component no longer collides with the app component', () => {
  let registrations = 0;
  for (const f of beaconFiles) {
    for (const args of callArgs(f.content, 'addComponent')) {
      registrations++;
      const raw = prop(args.trim(), 'name');
      const name = raw === undefined ? undefined : resolveString(f.content, raw);
      expect(
        name,
        `addComponent in ${f.rel} needs a statically analyzable name (kit calls must be statically analyzable)`
      ).toBeDefined();
      expect(
        /beacon/i.test(name!),
        `component \`${name}\` must carry the module name so it cannot clash with the app's own components`
      ).toBe(true);
    }
    for (const args of callArgs(f.content, 'addComponentsDir')) {
      registrations++;
      const rawPrefix = prop(args.trim(), 'prefix');
      const prefix = rawPrefix === undefined ? undefined : resolveString(f.content, rawPrefix);
      const rawPath = prop(args.trim(), 'path');
      const dir = rawPath === undefined ? undefined : resolveString(f.content, rawPath)?.replace(/^\.\//, '');
      const vueFiles = beaconFiles.filter(v =>
        v.rel.endsWith('.vue') && (dir === undefined || v.rel.includes(dir))
      );
      const beaconNamed = vueFiles.length > 0 && vueFiles.every(v => /beacon/i.test(v.rel.split('/').pop()!));
      expect(
        (prefix !== undefined && /beacon/i.test(prefix)) || beaconNamed,
        'components registered from a directory need a beacon prefix or beacon-named files'
      ).toBe(true);
    }
  }
  expect(registrations, 'the module must still register its chart component').toBeGreaterThan(0);
});

test('The module server route no longer shadows the app /api/track route', () => {
  let handlers = 0;
  let scanDirs = 0;
  for (const f of beaconFiles) {
    for (const args of callArgs(f.content, 'addServerHandler')) {
      handlers++;
      const raw = prop(args.trim(), 'route');
      const route = raw === undefined ? undefined : resolveString(f.content, raw);
      expect(
        route,
        `addServerHandler in ${f.rel} needs a statically analyzable, namespaced route — a route-less handler runs on every request, including the app's own /api/track`
      ).toBeDefined();
      expect(
        /beacon/i.test(route!),
        `route \`${route}\` must be namespaced with the module name to stay clear of user routes`
      ).toBe(true);
    }
    scanDirs += callArgs(f.content, 'addServerScanDir').length;
  }
  expect(handlers + scanDirs, 'the module must still register its tracking endpoint').toBeGreaterThan(0);

  if (scanDirs > 0) {
    // every scannable route file resolves to its file path as a route, so each
    // must carry the module name — an unprefixed leftover still shadows the app
    for (const f of beaconFiles.filter(f => /\/server\/(api|routes)\//.test(f.rel))) {
      expect(
        /beacon/i.test(f.rel.slice(f.rel.indexOf('/server/'))),
        `scanned route file \`${f.rel}\` must carry the module name in its route path`
      ).toBe(true);
    }
  }

  expect(
    moduleTree,
    "nothing in the module may still point at the app's /api/track (the default endpoint counts)"
  ).not.toMatch(/['"`]\/api\/track['"`]/);
});

test('The module composable is namespaced', () => {
  const exposed: string[] = [];
  let dirCalls = 0;
  for (const f of beaconFiles) {
    const importObjects: string[] = [];
    for (const args of callArgs(f.content, 'addImports')) {
      const t = args.trim();
      if (t.startsWith('[')) {
        // array form: harvest every object sitting directly in the array
        let depth = 0;
        let start = -1;
        let quote: string | null = null;
        for (let i = 0; i < t.length; i++) {
          const c = t[i]!;
          if (quote) {
            if (c === '\\') i++;
            else if (c === quote) quote = null;
            continue;
          }
          if (QUOTES.includes(c)) quote = c;
          else if (c === '{') {
            if (depth === 1) start = i;
            depth++;
          } else if (c === '}') {
            depth--;
            if (depth === 1 && start !== -1) {
              importObjects.push(t.slice(start, i + 1));
              start = -1;
            }
          } else if (OPEN.includes(c)) depth++;
          else if (CLOSE.includes(c)) depth--;
        }
      } else if (t.startsWith('{')) {
        importObjects.push(t);
      }
    }
    for (const args of callArgs(f.content, 'addImportsSources')) {
      const imports = propAtDepth1(args.trim(), 'imports');
      for (const name of imports?.match(/['"`]([^'"`\n]+)['"`]/g) ?? []) {
        exposed.push(name.slice(1, -1));
      }
    }
    for (const obj of importObjects) {
      const rawAs = prop(obj, 'as');
      const rawName = prop(obj, 'name');
      const raw = rawAs ?? rawName;
      if (raw === undefined) continue;
      const value = resolveString(f.content, raw);
      expect(
        value,
        `addImports in ${f.rel} needs a statically analyzable name (kit calls must be statically analyzable)`
      ).toBeDefined();
      exposed.push(value!);
    }
    dirCalls += callArgs(f.content, 'addImportsDir').length;
  }

  if (dirCalls > 0) {
    for (const f of beaconFiles.filter(f => /\.(ts|js|mts|mjs)$/.test(f.rel) && !/\/server\//.test(f.rel))) {
      for (const m of f.content.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s+(use[\w$]+)|export\s+const\s+(use[\w$]+)\s*=/g)) {
        exposed.push((m[1] ?? m[2])!);
      }
    }
  }

  expect(exposed.length, 'the module must still expose its tracking composable').toBeGreaterThan(0);
  for (const name of exposed) {
    expect(
      /beacon/i.test(name),
      `composable \`${name}\` must carry the module name so it cannot clash with app composables`
    ).toBe(true);
  }
});

test('The module appends its stylesheet instead of replacing the app css', () => {
  const cssReceivers = ['nuxt\\.options\\.css'];
  for (const f of beaconFiles) {
    for (const m of f.content.matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=\s*nuxt\.options\.css\b/g)) {
      cssReceivers.push(`\\b${m[1]}`);
    }
  }
  const receiverRe = new RegExp(`(?:${cssReceivers.join('|')})`);

  let wired = false;
  for (const f of beaconFiles) {
    for (const recv of cssReceivers) {
      for (const { rhs } of assignments(f.content, recv)) {
        expect(
          receiverRe.test(expanded(f.content, rhs)),
          `\`= ${rhs.slice(0, 60)}\` throws away the app's own stylesheets — merge into the existing nuxt.options.css`
        ).toBe(true);
        const added = expanded(f.content, rhs.replace(new RegExp(`(?:${cssReceivers.join('|')})`, 'g'), ''));
        if (/\.css/.test(added)) wired = true;
      }
      for (const arg of callArgs(f.content, `${recv}\\.(?:push|unshift)`)) {
        if (/\.css/.test(expanded(f.content, arg))) wired = true;
      }
    }
  }
  expect(wired, 'the module stylesheet must still be added to nuxt.options.css').toBe(true);

  expect(moduleFiles.some(f => f.rel.endsWith('.css')), 'the module stylesheet file is gone').toBe(true);
  expect(existsSync(join(root, 'app', 'assets', 'css', 'main.css')), 'app/assets/css/main.css is gone').toBe(true);
});

test('Module options merge into runtime config without clobbering user values', () => {
  // receivers for the runtime config object, including one-hop aliases
  const rcReceivers = ['nuxt\\.options\\.runtimeConfig'];
  const publicReceivers = ['nuxt\\.options\\.runtimeConfig\\.public'];
  for (const f of beaconFiles) {
    for (const m of f.content.matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=\s*nuxt\.options\.runtimeConfig\.public\b/g)) {
      publicReceivers.push(`\\b${m[1]}`);
    }
    for (const m of f.content.matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=\s*nuxt\.options\.runtimeConfig\b(?!\.)/g)) {
      rcReceivers.push(`\\b${m[1]}`);
      publicReceivers.push(`\\b${m[1]}\\.public`);
    }
    if (/\b(?:const|let|var)\s*\{[^}]*\bruntimeConfig\b[^}]*\}\s*=\s*nuxt\.options\b/.test(f.content)) {
      rcReceivers.push('\\bruntimeConfig');
      publicReceivers.push('\\bruntimeConfig\\.public');
    }
  }
  const anyReceiverRe = new RegExp(`(?:${[...rcReceivers, ...publicReceivers].join('|')})`);
  const receivers = [
    ...publicReceivers.map(re => ({ re, isPublic: true })),
    ...rcReceivers.map(re => ({ re, isPublic: false }))
  ];

  // the resolved module options arrive as the first parameter of setup, or of a
  // helper it delegates to — both are `(options, nuxt)` shaped.
  // The lookbehind matters: a bare `options` is that parameter, whereas
  // `.options` is `nuxt.options` and says nothing about the user's config.
  const optionParams = optionContext().params;
  const optionsRe = optionParams.size
    ? new RegExp(`(?<![.\\w$])(?:${[...optionParams].join('|')})\\b`)
    : undefined;

  let publicWrites = 0;
  let optionsReachRuntime = false;
  for (const f of beaconFiles) {
    for (const { re, isPublic: receiverIsPublic } of receivers) {
      for (const { lhs, rhs } of assignments(f.content, `${re}(?:\\.[\\w$]+)*`)) {
        expect(
          lhs,
          "leaf-writing the user's siteId from the module masks the lost config instead of fixing the merge"
        ).not.toMatch(/\.siteId$/);

        const rest = lhs.replace(new RegExp(`^${re}`), '').split('.').filter(Boolean);
        // how many segments below `public` the write lands on: `public.beacon` is 1
        const depth = receiverIsPublic ? rest.length : rest.length - 1;
        const grown = expanded(f.content, rhs);

        if (receiverIsPublic || rest[0] === 'public' || /\bpublic\s*:/.test(grown)) publicWrites++;
        if (optionsRe?.test(grown)) optionsReachRuntime = true;

        // a write two or more levels below `public` targets one leaf value and
        // leaves its siblings alone, so it merges by construction
        if (depth >= 2) continue;
        expect(
          anyReceiverRe.test(grown),
          `\`${lhs} = ${rhs.slice(0, 60)}\` replaces the user's runtime config instead of merging into it`
        ).toBe(true);
      }
    }
    for (const args of callArgs(f.content, 'Object\\.assign')) {
      const target = args.split(',')[0]!.trim();
      if (anyReceiverRe.test(target)) {
        publicWrites++;
        if (optionsRe?.test(expanded(f.content, args))) optionsReachRuntime = true;
      }
    }
  }

  expect(
    publicWrites,
    'the module must still expose its options via runtimeConfig.public'
  ).toBeGreaterThan(0);
  if (optionsRe) {
    expect(
      optionsReachRuntime,
      'the runtime config write must carry the resolved module options, otherwise the nuxt.config `beacon` block still never reaches the app'
    ).toBe(true);
  }

  expect(
    moduleTree,
    "hardcoding the user's siteId inside the module masks the lost config instead of fixing the merge"
  ).not.toMatch(/siteId\s*:\s*['"`]nuxt-evals-demo/);
});

test('Module paths resolve relative to the module, not the project root', () => {
  expect(
    beaconTree,
    'resolve module paths from the module file itself (createResolver / new URL with import.meta.url or import.meta.dirname)'
  ).toMatch(/import\.meta\.(url|dirname)/);

  // dependency keys are legitimately root-anchored, so slice them out first
  let scanText = beaconTree;
  for (const f of beaconEntries) {
    for (const def of definitionObjects(f.content)) {
      const deps = propAtDepth1(def, 'moduleDependencies');
      if (deps) scanText = scanText.replace(deps, '');
    }
  }
  const offenders = [
    ...scanText.match(/['"`](?:~~?|@@?)\/[^'"`\n]*['"`]/g) ?? [],
    ...scanText.match(/['"`](?:\.\.?\/)+modules\/[^'"`\n]*['"`]/g) ?? [],
    ...scanText.match(/['"`]modules\/[^'"`\n]*['"`]/g) ?? []
  ].filter(s => !(/consent/.test(s) && !/runtime/.test(s)));
  expect(
    offenders,
    `root-anchored paths break as soon as the module moves: ${offenders.join(', ')}`
  ).toEqual([]);

  expect(
    moduleTree,
    'anchoring module paths to the project directory is the same defect with different spelling'
  ).not.toMatch(/process\.cwd\(\)|nuxt\.options\.rootDir|nuxt\.options\.srcDir|__dirname|__filename/);
});

test('The consent module is still its own module', () => {
  expect(
    consentEntry,
    'modules/beacon/consent.ts must stay a separate module with its own meta'
  ).toBeDefined();
  expect(consentEntry!.content).toMatch(/runtimeConfig\.public\.beaconConsent/);
});

test('Beacon declares its consent sub-module as a module dependency', () => {
  const depsValues: string[] = [];
  for (const f of beaconEntries) {
    for (const def of definitionObjects(f.content)) {
      const deps = propAtDepth1(def, 'moduleDependencies');
      if (deps !== undefined) depsValues.push(deps);
    }
  }
  expect(
    depsValues.length,
    'declare the consent module in moduleDependencies (a top-level defineNuxtModule option — Nuxt ignores it anywhere else) so Nuxt installs it: modules/beacon/consent.ts is not auto-scanned'
  ).toBeGreaterThan(0);

  const declared = depsValues.join('\n');
  const literalKey = /['"`][^'"`\n]*consent[^'"`\n]*['"`]\s*:/.test(declared);
  const computedKey = /\[[^\]\n]*consent[^\]\n]*\]\s*:/.test(declared);
  expect(
    literalKey || computedKey,
    'moduleDependencies must reference the consent module (by path — its meta name cannot resolve an unregistered local module)'
  ).toBe(true);

  // an optional dependency is never auto-installed, which is the whole defect
  const keyRe = /(['"`][^'"`\n]*consent[^'"`\n]*['"`]|\[[^\]\n]*consent[^\]\n]*\])\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(declared))) {
    let i = keyRe.lastIndex;
    let depth = 0;
    let quote: string | null = null;
    let start = -1;
    for (; i < declared.length; i++) {
      const c = declared[i]!;
      if (quote) {
        if (c === '\\') i++;
        else if (c === quote) quote = null;
        continue;
      }
      if (QUOTES.includes(c)) quote = c;
      else if (OPEN.includes(c)) {
        if (depth === 0) start = i;
        depth++;
      } else if (CLOSE.includes(c)) {
        depth--;
        if (depth === 0) break;
      } else if (depth === 0 && c === ',') break;
    }
    const value = start === -1 ? '' : declared.slice(start, i + 1);
    expect(
      value,
      'an `optional: true` dependency is not auto-installed, so the consent module still never loads'
    ).not.toMatch(/\boptional\s*:\s*true\b/);
  }
});

test('The deprecated installModule path is not used and consent is not inlined', () => {
  expect(
    moduleTree,
    'installModule is deprecated — declare the dependency in moduleDependencies instead'
  ).not.toMatch(/\binstallModule\b/);

  for (const f of beaconFiles) {
    for (const line of f.content.split('\n')) {
      expect(
        /nuxt\.options/.test(line) && /beaconConsent/.test(line),
        `${f.rel}: writing the consent module's config from beacon silences the symptom without loading the module`
      ).toBe(false);
    }
  }
});

test('The module still ships its tracking plugin', () => {
  expect(beaconTree, 'the module must still register its runtime plugin').toMatch(/\baddPlugin\s*\(/);
  const plugin = beaconFiles.find(f => /\bdefineNuxtPlugin\b/.test(f.content));
  expect(plugin, 'the runtime plugin file is gone — removing tracking is not fixing it').toBeDefined();
  expect(
    beaconTree,
    'the module must still honor the configured sampleRate'
  ).toMatch(/sampleRate/);
});

test('The app files were not changed to mask the module bugs', () => {
  expect(read('app/components/Chart.vue', "the app's own Chart.vue is gone")).toMatch(/revenue-chart/);
  expect(read('server/api/track.ts', "the app's own /api/track route is gone")).toMatch(/ORD-1042/);
  const page = read('app/pages/index.vue', 'app/pages/index.vue is gone');
  expect(page).toMatch(/<Chart[\s/>]/);
  expect(page).toMatch(/\/api\/track/);
});
