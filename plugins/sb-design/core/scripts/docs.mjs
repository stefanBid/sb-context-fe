#!/usr/bin/env node
// The project's documentation links: which official docs the skills open for THIS project. Stored in
// `.sb-context/docs.json` (it can be committed); a lean block of CLAUDE.md points every session to them.
// Format and rules: references/docs.md.
//
// Usage (from anywhere inside a Nuxt or Vue project):
//   node docs.mjs detect                          the profile in one line, the packages the catalog knows (with the major the
//                                                 project uses and the one the docs document), the links proposed for them, the
//                                                 dependencies the catalog does not know, the saved links to review (JSON). Writes nothing
//   node docs.mjs get [--for plugin:skill]        the links in use, or the ones a skill opens (JSON): the project's when docs.json
//                                                 exists, else the catalog's for this project (source "catalog")
//   node docs.mjs add --catalog <id,…>            saves catalog links by id (<package>:<topic>, or <package>:* for all of a package)
//   node docs.mjs add '<json>'                    saves one link or a list ({ url, title, topic, package, version, summary, source,
//                                                 usedBy, verifiedAt }); a saved url is replaced
//   node docs.mjs remove <url|id> …               removes saved links
//   node docs.mjs set <url|id> <field> '<json>'   changes one field of a saved link (verifiedAt accepts "today")
//   node docs.mjs render [--write]                prints what CLAUDE.md would get (the action, then the block); --write writes it.
//                                                 Only the text between the markers changes; without markers the block is appended,
//                                                 without CLAUDE.md the file is created. No links: the block is removed
//
// `add`, `remove` and `set` write only `.sb-context/docs.json` (creating the folder with its .gitignore);
// `render --write` writes only CLAUDE.md (or .claude/CLAUDE.md when that is the one the project has).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, contextDirOf, ensureContextDir, relPath } from '../lib/project.mjs';
import { loadProfile, readPackage } from '../lib/profile.mjs';
import { parseValue } from '../lib/settings.mjs';
import { DOCS_FILE, START, packagesOf, catalogFor, catalogLink, catalogIds, emptyDocs, docsError, normalizeLink, upsertLinks, removeLinks, setField, linksFor, reviewOf, contextLine, renderBlock, applyBlock } from '../lib/docs.mjs';

const root = projectRoot();
const [cmd, ...rest] = process.argv.slice(2);
const file = join(contextDirOf(root), DOCS_FILE);
const today = new Date().toISOString().slice(0, 10);
const flag = (n) => {
  const i = rest.indexOf(n);
  return i === -1 ? null : (rest[i + 1] ?? '');
};
const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};

const { saved: savedProfile, profile } = loadProfile(root);
const packages = packagesOf(root, readPackage(root) ?? {});

const readDocs = () => {
  if (!existsSync(file)) return null;
  let docs;
  try {
    docs = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    fail(`${relPath(root, file)} is not valid JSON: fix or remove it.`);
  }
  const err = docsError(docs);
  if (err) fail(`${relPath(root, file)} cannot be used: ${err}.`);
  return docs;
};
const save = (docs) => {
  ensureContextDir(root);
  writeFileSync(file, JSON.stringify({ ...docs, updatedAt: today }, null, 2) + '\n');
};
/** The CLAUDE.md of the project: the root one, else .claude/CLAUDE.md, else the root one to create. */
const claudeFile = () => [join(root, 'CLAUDE.md'), join(root, '.claude', 'CLAUDE.md')].find((p) => existsSync(p)) ?? join(root, 'CLAUDE.md');
const skillFlag = () => {
  const s = flag('--for');
  if (s !== null && !/^sb-[a-z]+:[a-z][a-z-]*$/.test(s)) fail(`--for takes a skill as plugin:skill (sb-design:extract-ui), got "${s}".`);
  return s;
};

if (cmd === 'detect') {
  const docs = readDocs();
  const found = catalogFor(profile, packages);
  const savedUrls = new Set((docs?.links ?? []).map((l) => l.url));
  const claude = claudeFile();
  const claudeText = existsSync(claude) ? readFileSync(claude, 'utf8') : null;
  console.log(
    JSON.stringify(
      {
        file: docs ? relPath(root, file) : null,
        claudeMd: { file: relPath(root, claude), exists: claudeText !== null, block: Boolean(claudeText?.includes(START)) },
        profile: profile && { saved: Boolean(savedProfile), framework: profile.framework, bundler: profile.bundler, kind: profile.kind, rendering: profile.rendering, adapter: profile.adapter },
        context: contextLine(profile, packages),
        packages: found.packages,
        proposals: found.proposals.map((p) => ({ ...p, saved: savedUrls.has(p.url) })),
        uncatalogued: found.uncatalogued,
        saved: { count: docs?.links.length ?? 0, review: reviewOf(docs?.links ?? [], packages) },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (cmd === 'get') {
  const skill = skillFlag();
  const docs = readDocs();
  if (docs) {
    const links = linksFor(docs.links, skill);
    const note = skill && !links.length && docs.links.length ? `no link of this project is marked for ${skill}: \`get\` without --for lists all ${docs.links.length}` : null;
    console.log(JSON.stringify({ source: 'project', file: relPath(root, file), links, ...(note && { note }) }, null, 2));
  } else {
    const links = linksFor(catalogFor(profile, packages).proposals.map((p) => catalogLink(p.id)), skill);
    console.log(JSON.stringify({ source: 'catalog', file: null, links, note: 'the project has no docs.json yet: these are the catalog links for its stack (/sb-core:context chooses them with the user)' }, null, 2));
  }
  process.exit(0);
}

if (cmd === 'add') {
  let links;
  try {
    if (flag('--catalog') !== null) {
      if (!flag('--catalog')) fail('Usage: docs.mjs add --catalog <package:topic,…>');
      links = catalogIds(flag('--catalog').split(',').map((s) => s.trim()).filter(Boolean), profile).map((id) => catalogLink(id));
    } else {
      if (rest[0] === undefined) fail("Usage: docs.mjs add '<json link or list>' | add --catalog <ids>");
      const raw = parseValue(rest[0]);
      links = (Array.isArray(raw) ? raw : [raw]).map((l) => normalizeLink(l, { today }));
    }
  } catch (e) {
    fail(e.message);
  }
  const { docs, added, updated } = upsertLinks(readDocs() ?? emptyDocs(), links);
  if (!added.length && !updated.length) {
    console.log(`Nothing changed: ${links.length === 1 ? 'the link is' : `the ${links.length} links are`} already saved as given.`);
    process.exit(0);
  }
  save(docs);
  console.log(`Saved in ${relPath(root, file)}: ${added.length} added, ${updated.length} updated (${docs.links.length} links). Run \`render\` to update CLAUDE.md.`);
  process.exit(0);
}

if (cmd === 'remove') {
  if (!rest.length) fail('Usage: docs.mjs remove <url|id> …');
  const docs = readDocs();
  if (!docs) fail(`No ${relPath(root, file)} yet: nothing to remove.`);
  const { docs: next, removed, missing } = removeLinks(docs, rest);
  if (removed.length) save(next);
  console.log(`Removed ${removed.length} link(s) from ${relPath(root, file)}${missing.length ? `; not saved: ${missing.join(', ')}` : ''}.${removed.length ? ' Run `render` to update CLAUDE.md.' : ''}`);
  process.exit(missing.length && !removed.length ? 2 : 0);
}

if (cmd === 'set') {
  const [ref, field, raw] = rest;
  if (!ref || !field || raw === undefined) fail("Usage: docs.mjs set <url|id> <field> '<json value>'");
  const docs = readDocs();
  if (!docs) fail(`No ${relPath(root, file)} yet: add the link first.`);
  try {
    save(setField(docs, ref, field, parseValue(raw), { today }));
  } catch (e) {
    fail(e.message);
  }
  console.log(`Saved ${field} of ${ref} in ${relPath(root, file)}.`);
  process.exit(0);
}

if (cmd === 'render') {
  const docs = readDocs() ?? emptyDocs();
  const target = claudeFile();
  const name = relPath(root, target);
  const before = existsSync(target) ? readFileSync(target, 'utf8') : null;
  let result;
  try {
    result = applyBlock(before, renderBlock({ profile, packages, links: docs.links }));
  } catch (e) {
    fail(`${name}: ${e.message}`);
  }
  const what = {
    create: `${name} does not exist: it would be created with only this block`,
    insert: `${name} has no block yet: it would be appended at the end, the rest of the file untouched`,
    replace: `${name}: the block between the markers would be replaced, the rest of the file untouched`,
    remove: `${name}: no links are saved, the block would be removed`,
    unchanged: `${name}: the block is already up to date`,
    none: `no links are saved and ${name} has no block: nothing to write`,
  }[result.action];
  if (!rest.includes('--write')) {
    console.log(`Action: ${what}.`);
    const block = renderBlock({ profile, packages, links: docs.links });
    if (block) console.log(`\n${block}`);
    process.exit(0);
  }
  if (['unchanged', 'none'].includes(result.action)) {
    console.log(`Nothing written: ${what}.`);
    process.exit(0);
  }
  writeFileSync(target, result.text);
  console.log(`${{ create: 'Created', insert: 'Added the block to', replace: 'Updated the block of', remove: 'Removed the block from' }[result.action]} ${name}.`);
  process.exit(0);
}

console.error('Commands: detect | get | add | remove | set | render. See the header of this file.');
process.exit(2);
