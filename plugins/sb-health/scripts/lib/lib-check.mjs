// The logic of lib-check.mjs, without I/O: what a published Vue/Vite library declares in package.json
// against what it ships, and how it declares the libraries its users also install.
//
// Every finding: { code, severity: 'error' | 'warning', subject, message }.

const FRAMEWORK = 'vue';

/** Every file path package.json points to: [{ field, path }] (exports walked through every condition and subpath). */
export function declaredTargets(pkg) {
  const out = [];
  const walk = (node, field) => {
    if (typeof node === 'string') out.push({ field, path: node });
    else if (Array.isArray(node)) node.forEach((n) => walk(n, field));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${field}[${JSON.stringify(k)}]`);
  };
  if (pkg.exports !== undefined) walk(typeof pkg.exports === 'string' ? { '.': pkg.exports } : pkg.exports, 'exports');
  for (const f of ['main', 'module', 'types', 'typings']) if (typeof pkg[f] === 'string') out.push({ field: f, path: pkg[f] });
  if (typeof pkg.bin === 'string') out.push({ field: 'bin', path: pkg.bin });
  else if (pkg.bin && typeof pkg.bin === 'object') for (const [k, v] of Object.entries(pkg.bin)) out.push({ field: `bin[${JSON.stringify(k)}]`, path: v });
  return out;
}

const clean = (p) => p.replace(/^\.\//, '');

/** Whether a declared path is shipped: an exact file, or for a subpath pattern (`./dist/*.js`) at least one match. */
export function isShipped(path, files) {
  const p = clean(path);
  if (!p.includes('*')) return files.has(p);
  const [head, tail] = p.split('*');
  return [...files].some((f) => f.startsWith(head) && f.endsWith(tail) && f.length >= head.length + tail.length);
}

/** The declaration file TypeScript looks for next to a JavaScript file: index.js → index.d.ts, .mjs → .d.mts, .cjs → .d.cts. */
export const siblingTypes = (path) => clean(path).replace(/\.(m|c)?js$/, (_, x) => `.d.${x ?? ''}ts`);

const stringsOf = (node) => (typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(stringsOf) : node && typeof node === 'object' ? Object.values(node).flatMap(stringsOf) : []);

/**
 * exports and types: a subpath whose conditions list `types` after another condition (TypeScript takes the first
 * that matches), or that has no `types` while its JavaScript has no declaration file next to it (TypeScript then
 * finds no types: with "exports" it ignores the top-level "types"). [{ sub, kind: 'missing' | 'order' }]
 */
export function typesConditionIssues(pkg, files) {
  const issues = [];
  if (!pkg.exports || typeof pkg.exports !== 'object' || !(pkg.types || pkg.typings)) return issues;
  const entries = Object.keys(pkg.exports).some((k) => k.startsWith('.')) ? Object.entries(pkg.exports) : [['.', pkg.exports]];
  const hasTypesKey = (c, where) => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
    const keys = Object.keys(c);
    if (keys.includes('types')) {
      if (keys[0] !== 'types') issues.push({ sub: where, kind: 'order' });
      return true;
    }
    return keys.filter((k) => c[k] && typeof c[k] === 'object').map((k) => hasTypesKey(c[k], `${where} → ${k}`)).some(Boolean);
  };
  for (const [sub, cond] of entries) {
    if (hasTypesKey(cond, sub)) continue;
    const js = stringsOf(cond).filter((p) => /\.(m|c)?js$/.test(p) && !p.includes('*'));
    if (js.length && !js.every((p) => files.has(siblingTypes(p)))) issues.push({ sub, kind: 'missing' });
  }
  return issues;
}

// --- semver, only as far as majors go (the plugins carry no dependencies) ---------------------------

const num = (s) => {
  const m = String(s).match(/(\d+)/);
  return m ? Number(m[1]) : null;
};

/** One alternative of a range (no `||`): { open, test(major) }. */
function alternative(part) {
  const p = part.trim();
  if (['', '*', 'x', 'X', 'latest'].includes(p)) return { open: true, test: () => true };
  const hyphen = p.match(/^(\S+)\s+-\s+(\S+)$/);
  if (hyphen) return { open: false, test: (m) => m >= num(hyphen[1]) && m <= num(hyphen[2]) };
  const lower = p.match(/>(=?)\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  const upper = p.match(/<(=?)\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (lower || upper) {
    const lo = lower ? Number(lower[2]) : 0;
    const hi = upper ? Number(upper[2]) : Infinity;
    // <5 and <5.0.0 exclude major 5; <5.2 or <=5 still let some 5.x in
    const hiIncl = upper && (upper[1] === '=' || Number(upper[3] ?? 0) > 0 || Number(upper[4] ?? 0) > 0);
    return { open: !upper, test: (m) => m >= lo && (hiIncl ? m <= hi : m < hi) };
  }
  const n = num(p);
  return n === null ? { open: true, test: () => true } : { open: false, test: (m) => m === n };
}

/** Whether a major is allowed by a range, and whether the range has no upper bound. */
export function rangeMajors(range) {
  const alts = String(range ?? '').split('||').map(alternative);
  return { open: alts.some((a) => a.open), allows: (major) => alts.some((a) => a.test(major)) };
}

// --- the checks ---------------------------------------------------------------------------------------

/** A package (or a subpath of it) imported by the code: from 'x', import('x'), require('x'). */
export const importsPackage = (code, name) => {
  const esc = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(`(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\brequire\\s*\\(\\s*|\\bimport\\s+)['"]${esc}(?:/[^'"]*)?['"]`).test(code);
};

/**
 * All the checks. input:
 *   pkg       package.json
 *   files     Set of the paths the package ships (npm pack), or of the files on disk
 *   metaOf    name → installed package.json of a dependency, or null
 *   output    [{ file, code }] the built JavaScript the package ships
 *   source    [{ file, code }] the library's own source (src/)
 *   fromPack  whether `files` is the real list of npm pack (else the disk, which ignores the `files` field)
 * Returns { findings, targets, built }: built = false when no declared JavaScript target exists (nothing to check yet).
 */
export function checkLibrary({ pkg, files, metaOf = () => null, output = [], source = [], fromPack = false }) {
  const findings = [];
  const add = (code, severity, subject, message) => findings.push({ code, severity, subject, message });
  const targets = declaredTargets(pkg).map((t) => ({ ...t, shipped: isShipped(t.path, files) }));
  const js = targets.filter((t) => /\.(m?js|cjs)$/.test(t.path) || !/\.[a-z]+$/i.test(t.path.replace(/\*/g, '')));
  const built = js.length === 0 || js.some((t) => t.shipped);

  // L1 / L2: what package.json points to is in the package
  if (!targets.length) add('L1', 'error', 'package.json', 'no exports, main, module or types: consumers cannot import the library.');
  if (built)
    for (const t of targets.filter((x) => !x.shipped))
      add('L1', 'error', t.field, `${t.path} is ${fromPack ? 'not in the published package (npm pack)' : 'missing from the build output'}.`);
  if (!pkg.files) add('L2', 'warning', 'files', 'no "files" field: everything not ignored is published (sources, tests, configs). List the build output folder.');

  // L3 / L4: types reachable through exports
  for (const i of built ? typesConditionIssues(pkg, files) : []) {
    if (i.kind === 'missing') add('L3', 'error', `exports[${JSON.stringify(i.sub)}]`, 'no "types" condition and no .d.ts next to its JavaScript: with "exports", TypeScript (moduleResolution bundler / node16) ignores the top-level "types", so consumers get no types.');
    else add('L4', 'warning', `exports[${JSON.stringify(i.sub)}]`, '"types" is not the first condition: TypeScript takes the first condition that matches, put "types" first.');
  }
  if ((pkg.types || pkg.typings) && built && ![...files].some((f) => f.endsWith('.d.ts') || f.endsWith('.d.mts') || f.endsWith('.d.cts')))
    add('L1', 'error', 'types', 'no .d.ts file in the package: generate them (vue-tsc, vite-plugin-dts).');

  // L5–L8: peers
  const deps = pkg.dependencies ?? {};
  const peers = pkg.peerDependencies ?? {};
  const dev = pkg.devDependencies ?? {};
  if (deps[FRAMEWORK]) add('L5', 'error', FRAMEWORK, '"vue" is in dependencies: it must be a peerDependency (and a devDependency), or the app ends up with two copies of Vue.');
  for (const name of Object.keys(deps)) {
    if (name === FRAMEWORK) continue;
    if (peers[name]) {
      add('L6', 'warning', name, 'both a dependency and a peerDependency: keep it only as a peer (and a devDependency).');
      continue;
    }
    const meta = metaOf(name);
    if (meta?.peerDependencies?.[FRAMEWORK])
      add('L6', 'warning', name, `it has "vue" as a peer, so the app installs it too: make it a peerDependency (and a devDependency), or two versions can end up in the app.`);
  }
  for (const [name, range] of Object.entries(peers)) {
    const r = rangeMajors(range);
    if (r.open) add('L8', 'warning', name, `peer range "${range}" has no upper bound: a future major would be accepted untested. Use a caret range (^x) or list the majors (^x || ^y).`);
    if (!dev[name]) {
      add('L7', 'warning', name, 'peerDependency not in devDependencies: the library is built and tested against whatever version gets installed.');
      continue;
    }
    const installed = num(metaOf(name)?.version ?? dev[name]);
    if (installed !== null && !r.allows(installed)) add('L7', 'error', name, `devDependencies use major ${installed}, outside the peer range "${range}": the library is tested on a version its users cannot install.`);
  }

  // L9: peers are external, not bundled
  if (built && output.length)
    for (const name of Object.keys(peers)) {
      if (!source.some((s) => importsPackage(s.code, name))) continue;
      if (!output.some((o) => importsPackage(o.code, name)))
        add('L9', 'error', name, 'the source imports it but no built file does: it was bundled into the output. Add it to build.rollupOptions.external (every peer).');
    }

  // L10: CSS shipped and dropped by tree-shaking
  if (pkg.sideEffects === false && [...files].some((f) => f.endsWith('.css')))
    add('L10', 'warning', 'sideEffects', '"sideEffects": false and the package ships CSS: bundlers drop CSS imports. Use "sideEffects": ["**/*.css"].');

  return { findings, targets, built };
}
