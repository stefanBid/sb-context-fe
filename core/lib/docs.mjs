// The project's documentation links: which official docs the skills open for THIS project, at the versions it uses.
//
// Stored in .sb-context/docs.json (it can be committed), chosen with /sb-core:context: the catalog (docs-catalog.mjs)
// proposes the links that fit the profile and the dependencies, the user keeps, drops or adds their own.
// A lean block of CLAUDE.md, between the markers below, points every session to them; the summaries, the
// verification dates and which skill uses which link stay in docs.json (CLAUDE.md is loaded every session).
//
// Logic only: the one read of the project is packagesOf (package.json and node_modules); docs.mjs does the rest of the I/O.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG } from './docs-catalog.mjs';
import { dig } from './profile.mjs';

export { CATALOG };
export const SCHEMA = 1;
export const DOCS_FILE = 'docs.json';
export const START = '<!-- sb-context:docs:start -->';
export const END = '<!-- sb-context:docs:end -->';
/** The fields of a link, in the order they are saved. */
export const FIELDS = ['url', 'title', 'topic', 'package', 'version', 'summary', 'source', 'usedBy', 'verifiedAt'];
/** proposed: from the catalog (or found by Claude and accepted); user: a link the user gave. */
export const SOURCES = ['proposed', 'user'];

const SKILL_ID = /^sb-[a-z]+:[a-z][a-z-]*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

// --- the project's packages -----------------------------------------------------------------------

/** A URL of a package's own package.json (homepage, else the repository), or null. */
function homepageOf(meta) {
  if (typeof meta?.homepage === 'string' && /^https?:\/\//.test(meta.homepage)) return meta.homepage;
  const repo = typeof meta?.repository === 'string' ? meta.repository : meta?.repository?.url;
  if (typeof repo !== 'string') return null;
  const gh = repo.match(/github\.com[/:]([^/]+\/[^/#]+?)(?:\.git)?(?:#.*)?$/) ?? repo.match(/^(?:github:)?([\w.-]+\/[\w.-]+)$/);
  return gh ? `https://github.com/${gh[1]}#readme` : null;
}

/**
 * Every package the project declares: [{ package, in, declared, installed, major, version, homepage }].
 * in: where it is declared (dependencies, peerDependencies, devDependencies); installed: the version in node_modules;
 * version: "major.minor" of the installed one, else the major of the range.
 */
export function packagesOf(root, pkg) {
  const where = {};
  for (const field of ['peerDependencies', 'dependencies', 'devDependencies'])
    for (const [name, range] of Object.entries(pkg?.[field] ?? {})) (where[name] ??= { declared: range, in: [] }).in.push(field);
  return Object.entries(where)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, { declared, in: fields }]) => {
      const meta = readJson(join(root, 'node_modules', name, 'package.json'));
      const installed = typeof meta?.version === 'string' ? meta.version : null;
      const m = (installed ?? (typeof declared === 'string' ? declared : '')).match(/(\d+)(?:\.(\d+))?/);
      const major = m ? Number(m[1]) : null;
      return { package: name, in: fields, declared, installed, major, version: installed && m ? `${m[1]}.${m[2] ?? 0}` : major === null ? null : String(major), homepage: homepageOf(meta) };
    });
}

/** The libraries the profile names (a Nuxt module only in nuxt.config, a color-mode or fonts module). */
const profileLibraries = (profile) => [...Object.values(profile?.features ?? {}), profile?.styling?.colorMode, profile?.styling?.fonts].filter((v) => typeof v === 'string');

/** Whether a link applies to the profile: every key of `when` matches (a list is any of). */
export function applies(profile, when) {
  return Object.entries(when ?? {}).every(([k, v]) => (Array.isArray(v) ? v.includes(dig(profile, k)) : dig(profile, k) === v));
}

/** current | behind (the project is on an older major than the docs) | ahead (the catalog is older than the project) | unknown */
export const statusOf = (installed, docs) => (installed == null ? 'unknown' : installed < docs ? 'behind' : installed > docs ? 'ahead' : 'current');

/**
 * What the catalog has for this project.
 * packages: [{ package, name, docsMajor, installed, status, older }] (older: the docs of the installed major, when the project is behind)
 * proposals: [{ id, package, topic, title, url, version, usedBy }], only the links whose `when` fits the profile.
 * uncatalogued: the runtime dependencies and peers the catalog does not know, with their homepage when installed.
 */
export function catalogFor(profile, packages, catalog = CATALOG) {
  const byName = new Map(packages.map((p) => [p.package, p]));
  const named = new Set([...byName.keys(), ...profileLibraries(profile)]);
  const entries = catalog.filter((e) => named.has(e.package));
  const known = new Set(catalog.map((e) => e.package));
  return {
    packages: entries.map((e) => {
      const installed = byName.get(e.package)?.major ?? (e.package === profile?.framework?.name ? (profile.framework.major ?? null) : null);
      const status = statusOf(installed, e.major);
      return { package: e.package, name: e.name, docsMajor: e.major, installed, status, older: status === 'behind' && e.older ? e.older.replace('{major}', installed) : null };
    }),
    proposals: entries.flatMap((e) =>
      e.links.filter((l) => applies(profile, l.when)).map((l) => ({ id: `${e.package}:${l.topic}`, package: e.package, topic: l.topic, title: l.title, url: l.url, version: String(e.major), usedBy: l.usedBy ?? [] })),
    ),
    uncatalogued: packages
      .filter((p) => !known.has(p.package) && !p.package.startsWith('@types/') && p.in.some((f) => f !== 'devDependencies'))
      .map((p) => ({ package: p.package, version: p.version, homepage: p.homepage })),
  };
}

/** The catalog link with this id (<package>:<topic>), as a link of docs.json, or null. */
export function catalogLink(id, catalog = CATALOG) {
  const at = id.lastIndexOf(':');
  const e = catalog.find((x) => x.package === id.slice(0, at));
  const l = e?.links.find((x) => x.topic === id.slice(at + 1));
  return l ? { url: l.url, title: l.title, topic: l.topic, package: e.package, version: String(e.major), summary: null, source: 'proposed', usedBy: l.usedBy ?? [], verifiedAt: null } : null;
}

/** The ids a list names: exact ids, or <package>:* for every link of a package that fits the profile. Unknown ids throw. */
export function catalogIds(list, profile, catalog = CATALOG) {
  return list.flatMap((id) => {
    if (id.endsWith(':*')) {
      const e = catalog.find((x) => x.package === id.slice(0, -2));
      if (!e) throw new Error(`${id}: the catalog has no package ${id.slice(0, -2)}.`);
      return e.links.filter((l) => applies(profile, l.when)).map((l) => `${e.package}:${l.topic}`);
    }
    if (!catalogLink(id, catalog)) throw new Error(`${id} is not a link of the catalog (ids are <package>:<topic>, as detect lists them).`);
    return [id];
  });
}

// --- docs.json --------------------------------------------------------------------------------------

export const emptyDocs = () => ({ schema: SCHEMA, updatedAt: null, links: [] });

/** Why a docs.json cannot be used, or null. */
export function docsError(docs) {
  if (!docs || typeof docs !== 'object' || Array.isArray(docs)) return 'it is not a JSON object';
  if (docs.schema !== SCHEMA) return `schema ${docs.schema} is not ${SCHEMA}`;
  if (!Array.isArray(docs.links)) return '"links" is not a list';
  return null;
}

const isUrl = (u) => {
  try {
    return ['http:', 'https:'].includes(new URL(u).protocol);
  } catch {
    return false;
  }
};

/** One field of a link, checked; throws with the reason. today replaces the value "today" of verifiedAt. */
export function fieldValue(field, value, { today } = {}) {
  const str = (v, required) => {
    if (v == null || v === '') {
      if (required) throw new Error(`${field} is required.`);
      return null;
    }
    if (typeof v !== 'string') throw new Error(`${field} must be a string.`);
    return v.trim();
  };
  switch (field) {
    case 'url':
      if (!isUrl(value)) throw new Error(`url must be an http(s) URL, got ${JSON.stringify(value)}.`);
      return value;
    case 'title':
      return str(value, true);
    case 'topic':
    case 'package':
    case 'summary':
      return str(value, false);
    case 'version':
      return typeof value === 'number' ? String(value) : str(value, false);
    case 'source':
      if (!SOURCES.includes(value)) throw new Error(`source must be one of ${SOURCES.join(', ')}.`);
      return value;
    case 'usedBy':
      if (!Array.isArray(value) || value.some((s) => typeof s !== 'string' || !SKILL_ID.test(s))) throw new Error('usedBy must be a list of skills written plugin:skill (["sb-design:extract-ui"]).');
      return [...new Set(value)].sort();
    case 'verifiedAt':
      if (value === 'today') return today;
      if (value != null && !(typeof value === 'string' && DATE.test(value))) throw new Error('verifiedAt must be a date (YYYY-MM-DD), "today" or null.');
      return value ?? null;
    default:
      throw new Error(`${field} is not a field of a link (${FIELDS.join(', ')}).`);
  }
}

/** A link with every field, checked and in order. Defaults: source "user", no usedBy, not verified. */
export function normalizeLink(input, opts = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('a link is a JSON object ({ "url": …, "title": … }).');
  const unknown = Object.keys(input).filter((k) => !FIELDS.includes(k));
  if (unknown.length) throw new Error(`${unknown.join(', ')}: not a field of a link (${FIELDS.join(', ')}).`);
  const defaults = { source: 'user', usedBy: [], verifiedAt: null };
  return Object.fromEntries(FIELDS.map((f) => [f, fieldValue(f, input[f] ?? defaults[f] ?? null, opts)]));
}

/** docs with the links added (a link whose url is already saved replaces it). { docs, added, updated } (urls). */
export function upsertLinks(docs, links) {
  const out = structuredClone(docs);
  const added = [];
  const updated = [];
  for (const l of links) {
    const i = out.links.findIndex((x) => x.url === l.url);
    if (i === -1) {
      out.links.push(l);
      added.push(l.url);
    } else if (JSON.stringify(out.links[i]) !== JSON.stringify(l)) {
      out.links[i] = l;
      updated.push(l.url);
    }
  }
  return { docs: out, added, updated };
}

/** The saved link a reference names: its url, or a catalog id whose url is saved. */
export function findLink(docs, ref) {
  const url = isUrl(ref) ? ref : catalogLink(ref)?.url;
  return url ? (docs.links.find((l) => l.url === url) ?? null) : null;
}

/** docs without the links the refs name. { docs, removed, missing }. */
export function removeLinks(docs, refs) {
  const out = structuredClone(docs);
  const removed = [];
  const missing = [];
  for (const ref of refs) {
    const l = findLink(out, ref);
    if (!l) missing.push(ref);
    else {
      out.links = out.links.filter((x) => x.url !== l.url);
      removed.push(l.url);
    }
  }
  return { docs: out, removed, missing };
}

/** docs with one field of one link changed (checked). Throws when the link is not saved or the value is wrong. */
export function setField(docs, ref, field, value, opts = {}) {
  const l = findLink(docs, ref);
  if (!l) throw new Error(`${ref} is not a saved link.`);
  const next = { ...l, [field]: fieldValue(field, value, opts) };
  if (field === 'url' && next.url !== l.url && docs.links.some((x) => x.url === next.url)) throw new Error(`${next.url} is already saved.`);
  return { ...structuredClone(docs), links: docs.links.map((x) => (x.url === l.url ? next : structuredClone(x))) };
}

/** The links a skill opens (plugin:skill), or all of them. */
export const linksFor = (links, skill = null) => (skill ? links.filter((l) => l.usedBy?.includes(skill)) : links);

/**
 * Saved links that may no longer fit the project: [{ url, why }].
 * A package no longer declared, or docs of another major than the one the project uses.
 */
export function reviewOf(links, packages) {
  const byName = new Map(packages.map((p) => [p.package, p]));
  return links.flatMap((l) => {
    if (!l.package) return [];
    const p = byName.get(l.package);
    if (!p) return [{ url: l.url, why: `${l.package} is no longer a dependency of the project` }];
    const docs = Number(String(l.version ?? '').match(/\d+/)?.[0]);
    if (Number.isFinite(docs) && p.major != null && docs !== p.major) return [{ url: l.url, why: `documents ${l.package} ${docs}, the project uses ${p.major}` }];
    return [];
  });
}

// --- the CLAUDE.md block ----------------------------------------------------------------------------

const FRAMEWORKS = { nuxt: 'Nuxt', vue: 'Vue' };
const BUNDLERS = { vite: 'Vite', webpack: 'webpack' };
const ENGINES = { tailwind4: ['Tailwind CSS', 'tailwindcss'], tailwind3: ['Tailwind CSS', 'tailwindcss'], scss: ['SCSS', null] };
const RENDERING = { ssr: 'app (SSR)', ssg: 'app (static generation)', csr: 'app (client-side rendering)' };
/** Peers of a library that are the stack itself, not a library it wraps. */
const STACK = new Set(['vue', 'nuxt', 'vue-router']);

const nameOf = (pkgName, catalog = CATALOG) => catalog.find((e) => e.package === pkgName)?.name ?? pkgName;
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** One line on what the project is, from the profile: "Vue 3.5 library in TypeScript, built with Vite 7 (lib mode), wrapping Floating UI." */
export function contextLine(profile, packages = []) {
  if (!profile?.framework) return null;
  const versionOf = (name, major) => packages.find((p) => p.package === name)?.version ?? (major == null ? null : String(major));
  const named = (label, name, major) => [label, versionOf(name, major)].filter(Boolean).join(' ');
  const fw = profile.framework.name;
  let line = `${named(FRAMEWORKS[fw] ?? fw, fw, profile.framework.major)} ${profile.kind === 'library' ? 'library' : profile.kind === 'app' ? (RENDERING[profile.rendering] ?? 'app') : 'project'}`;
  if (profile.language === 'ts') line += ' in TypeScript';
  const parts = [];
  const b = profile.bundler;
  if (b && (fw !== 'nuxt' || b.name !== 'vite')) parts.push(`built with ${named(BUNDLERS[b.name] ?? b.name, b.name, b.major)}${profile.kind === 'library' && b.name === 'vite' ? ' (lib mode)' : ''}`);
  const engine = ENGINES[profile.styling?.engine?.name];
  if (engine) parts.push(`styled with ${engine[1] ? named(engine[0], engine[1], profile.styling.engine.name.match(/\d+$/)?.[0]) : engine[0]}`);
  if (profile.kind === 'library') {
    const wrapped = [...new Set((profile.library?.peers ?? []).filter((p) => !STACK.has(p)).map((p) => nameOf(p)))];
    if (wrapped.length) parts.push(`wrapping ${listOf(wrapped)}`);
  }
  return `${[line, ...parts].join(', ')}.`;
}

/** The links grouped for the block: [{ label, links }], the catalog's order first, then the other packages, then the rest. */
export function groupsOf(links, catalog = CATALOG) {
  const order = (pkg) => {
    if (!pkg) return [2, ''];
    const i = catalog.findIndex((e) => e.package === pkg);
    return i === -1 ? [1, pkg] : [0, String(i).padStart(4, '0')];
  };
  const groups = new Map();
  for (const l of links) {
    const key = l.package ? nameOf(l.package, catalog) : 'Other';
    if (!groups.has(key)) groups.set(key, { key, rank: order(l.package), links: [] });
    groups.get(key).links.push(l);
  }
  return [...groups.values()]
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1].localeCompare(b.rank[1]))
    .map((g) => {
      const versions = [...new Set(g.links.map((l) => l.version).filter(Boolean))];
      return { label: [g.key, versions.join('/')].filter(Boolean).join(' '), links: g.links };
    });
}

const linkText = (title) => {
  const t = title.replace(/[[\]]/g, '\\$&');
  return /[<>]/.test(t) ? `\`${t}\`` : t;
};

/** The managed block of CLAUDE.md, markers included, or null when there are no links (the block is then removed). */
export function renderBlock({ profile, packages = [], links }) {
  if (!links.length) return null;
  const context = contextLine(profile, packages);
  return [
    START,
    '<!-- Written by /sb-core:context from .sb-context/docs.json: change the links there (or run the skill again), not here. -->',
    '## Project docs',
    '',
    ...(context ? [context, ''] : []),
    'These links are the source of truth for this stack, at the versions the project uses. Open them (WebFetch) when unsure or when your own knowledge may be out of date, and say what was not verified against them.',
    '',
    ...groupsOf(links).map((g) => `- **${g.label}**: ${g.links.map((l) => `[${linkText(l.title)}](${l.url})`).join(' · ')}`),
    END,
  ].join('\n');
}

/**
 * CLAUDE.md with the block in place: { text, action }. text null = the file does not exist.
 * action: create (no file), insert (appended at the end), replace, remove (no links: the block goes), unchanged, none (nothing to do).
 * Only the text between the markers (markers included) changes; markers that do not pair up throw, and nothing is written.
 */
export function applyBlock(text, block) {
  if (text == null) return block ? { text: `${block}\n`, action: 'create' } : { text: null, action: 'none' };
  const count = (m) => text.split(m).length - 1;
  const [starts, ends] = [count(START), count(END)];
  if (starts > 1 || ends > 1 || starts !== ends || (starts && text.indexOf(END) < text.indexOf(START)))
    throw new Error(`the markers ${START} … ${END} do not pair up in the file (${starts} start, ${ends} end): fix them by hand, nothing was written.`);
  const crlf = text.includes('\r\n');
  const eol = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);
  const nl = crlf ? '\r\n' : '\n';
  if (!starts) {
    if (!block) return { text, action: 'none' };
    const head = text.replace(/\s+$/, '');
    return { text: head ? `${head}${nl}${nl}${eol(block)}${nl}` : `${eol(block)}${nl}`, action: 'insert' };
  }
  const before = text.slice(0, text.indexOf(START));
  const after = text.slice(text.indexOf(END) + END.length);
  if (!block) {
    const head = before.replace(/\s+$/, '');
    const tail = after.replace(/^\s+/, '');
    return { text: head && tail ? `${head}${nl}${nl}${tail}` : head ? `${head}${nl}` : tail, action: 'remove' };
  }
  const next = `${before}${eol(block)}${after}`;
  return { text: next, action: next === text ? 'unchanged' : 'replace' };
}
