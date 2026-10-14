#!/usr/bin/env node
// Finds user-visible text that is NOT internationalized in Vue files, and message keys that do not exist.
//
// Usage (from anywhere inside a Nuxt project):
//   node check-i18n.mjs <files or folders> [--allow "Brand,Other"] [--locales <dir>] [--json]
//
// Inline text it reports, per file and line:
//   - literal text nodes in the template;
//   - literal strings inside interpolations: {{ 'Hello' }}, {{ `Hello` }};
//   - static AND bound-with-a-literal attributes people read: alt, title, placeholder, aria-label,
//     aria-description, aria-placeholder, label, summary (alt="x", :alt="'x'", :alt="`x`"), and <meta content>;
//   - in <script>: SEO strings (title, description, og*…), values of text-like keys
//     (label, title, text, description, placeholder, caption, message, heading, subtitle, alt, name…),
//     and any string that reads as a sentence (two or more plain words). Append `// i18n-ignore` to a line to skip it.
// `{{ $t(…) }}`, `:alt="t(…)"` and other expressions are fine. Skipped: <style>, <svg>, <code>, <pre>, comments,
// import/export-type lines, class-like strings. Words listed in --allow (brand names, proper nouns) are ignored.
//
// Keys: every `t('a.b')` / `$t('a.b')` / `<i18n-t keypath="a.b">` with a literal key is looked up in the locale files
// (JSON) of --locales, default `i18n.messagesDir` of .sb-context-nuxt/project-settings.json, else i18n/locales,
// locales, i18n/lang, lang. A key missing from the default locale is an error; missing from another locale is
// reported separately. Dynamic keys (`t(`a.${x}`)`) cannot be checked and are counted.
//
// A .vue file that does not parse is reported and counts as a failure: it cannot be checked.
// Exit 0 clean, 10 when text is inline, a key is missing or a file does not parse. Never modifies a file.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
import { projectRoot, srcDirOf, pluginDirOf } from './lib/project.mjs';
import { READ_ATTRS, SKIP_TAGS, textRules, literalOf, keysIn, scriptLineText, hasKey } from './lib/i18n-text.mjs';

const argv = process.argv.slice(2);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};
const root = projectRoot();
const asJson = argv.includes('--json');
const allow = (opt('--allow') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const targets = argv.filter((a, i) => !a.startsWith('--') && !['--allow', '--locales'].includes(argv[i - 1])).map((t) => resolve(t));
if (!targets.length) {
  console.error('Pass files or folders to check.');
  process.exit(2);
}

const req = createRequire(join(root, 'package.json'));
const bases = [req];
try {
  bases.push(createRequire(req.resolve('nuxt/package.json')));
} catch {}
let parseSfc;
for (const r of bases) {
  try {
    parseSfc = r('vue/compiler-sfc').parse;
    break;
  } catch {}
}
if (!parseSfc) {
  console.error('Cannot load vue/compiler-sfc from the project root or from nuxt. Install the dependencies first.');
  process.exit(2);
}

const files = [];
const walk = (p) => {
  if (!existsSync(p)) return;
  if (statSync(p).isDirectory()) for (const e of readdirSync(p)) e !== 'node_modules' && !e.startsWith('.') && walk(join(p, e));
  else if (p.endsWith('.vue')) files.push(p);
};
targets.forEach(walk);

const rules = textRules(allow);
const { hasText } = rules;

const found = [];
const keysUsed = [];
const parseErrors = [];
let dynamicKeys = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = relative(root, f);
  // the parser does not throw on a malformed template: it lists the errors and returns a partial tree
  const { descriptor, errors } = parseSfc(src, { filename: f });
  if (errors.length) {
    for (const e of errors) parseErrors.push({ file: rel, line: e.loc?.start?.line ?? null, message: e.message });
    continue;
  }
  const add = (line, kind, text) => found.push({ file: rel, line, kind, text: String(text).replace(/\s+/g, ' ').trim().slice(0, 80) });
  const key = (line, k) => keysUsed.push({ file: rel, line, key: k });

  const scanExpr = (exp, line) => {
    const { keys, dynamic } = keysIn(exp);
    for (const k of keys) key(line, k);
    dynamicKeys += dynamic;
  };

  const visit = (node) => {
    if (!node) return;
    if (node.type === 1) {
      if (SKIP_TAGS.has(node.tag)) return;
      for (const p of node.props ?? []) {
        if (p.type === 6 && p.value) {
          const name = p.name;
          const isMeta = name === 'content' && node.tag === 'meta' && /description|og:|twitter:/.test(JSON.stringify(node.props.map((x) => x.value?.content)));
          if ((READ_ATTRS.has(name) || isMeta) && hasText(p.value.content)) add(p.loc.start.line, `attr ${name}`, p.value.content);
          if (name === 'keypath' && node.tag.toLowerCase().replace(/-/g, '') === 'i18nt') key(p.loc.start.line, p.value.content);
        } else if (p.type === 7 && p.exp?.content) {
          const content = p.exp.content;
          scanExpr(content, p.loc.start.line);
          const argName = p.arg?.content;
          if (p.name === 'bind' && READ_ATTRS.has(argName)) {
            const lit = literalOf(content);
            if (lit != null && hasText(lit)) add(p.loc.start.line, `attr :${argName}`, lit);
          }
        }
      }
      node.children?.forEach(visit);
    } else if (node.type === 2) {
      if (hasText(node.content)) add(node.loc.start.line, 'text', node.content);
    } else if (node.type === 5) {
      const content = node.content?.content ?? '';
      scanExpr(content, node.loc.start.line);
      const lit = literalOf(content);
      if (lit != null && hasText(lit)) add(node.loc.start.line, 'interpolation', lit);
    }
  };
  descriptor.template?.ast?.children?.forEach(visit);

  for (const block of [descriptor.scriptSetup, descriptor.script]) {
    if (!block) continue;
    const base = block.loc.start.line;
    block.content.split('\n').forEach((line, i) => {
      if (/i18n-ignore/.test(line) || /^\s*(import|export\s+type|type|interface)\b/.test(line)) return;
      scanExpr(line, base + i);
      for (const { kind, text } of scriptLineText(line, rules)) add(base + i, kind, text);
    });
  }
}

// ---------------------------------------------------------------------------
// Keys vs locale files
// ---------------------------------------------------------------------------
let messagesDir = opt('--locales') ? resolve(opt('--locales')) : null;
if (!messagesDir) {
  try {
    const st = JSON.parse(readFileSync(join(pluginDirOf(root), 'project-settings.json'), 'utf8'));
    if (st.i18n?.messagesDir) messagesDir = resolve(root, st.i18n.messagesDir);
  } catch {}
}
if (!messagesDir) messagesDir = ['i18n/locales', 'locales', 'i18n/lang', 'lang', `${relative(root, srcDirOf(root)) || '.'}/locales`].map((d) => join(root, d)).find((d) => existsSync(d) && statSync(d).isDirectory()) ?? null;

const missingKeys = [];
let keyNote = null;
if (keysUsed.length) {
  if (!messagesDir) keyNote = 'no locale folder found: keys not checked';
  else {
    const locales = {};
    for (const f of readdirSync(messagesDir).filter((x) => x.endsWith('.json'))) {
      try {
        locales[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(messagesDir, f), 'utf8'));
      } catch {
        keyNote = `${f} is not valid JSON`;
      }
    }
    const names = Object.keys(locales);
    if (!names.length) keyNote = `no JSON locale files in ${relative(root, messagesDir)}: keys not checked`;
    else {
      let def = null;
      try {
        def = JSON.parse(readFileSync(join(pluginDirOf(root), 'project-settings.json'), 'utf8')).i18n?.defaultLocale ?? null;
      } catch {}
      def = def && names.includes(def) ? def : names[0];
      for (const u of keysUsed) for (const n of names) if (!hasKey(locales[n], u.key)) missingKeys.push({ ...u, locale: n, isDefault: n === def });
    }
  }
}

const bad = found.length > 0 || parseErrors.length > 0 || missingKeys.some((k) => k.isDefault);
if (asJson) console.log(JSON.stringify({ checked: files.length, inline: found, parseErrors, keysUsed: keysUsed.length, dynamicKeys, missingKeys, note: keyNote }, null, 2));
else {
  console.log(`Checked ${files.length} file(s): ${found.length ? `${found.length} piece(s) of text still inline` : 'no inline text ✓'}`);
  for (const x of found) console.log(`  ${x.file}:${x.line} [${x.kind}] ${x.text}`);
  if (parseErrors.length) console.log(`Not checked, the file does not parse (${parseErrors.length} error(s)):`);
  for (const e of parseErrors) console.log(`  ${e.file}${e.line ? `:${e.line}` : ''} ${e.message}`);
  if (keysUsed.length) {
    const d = missingKeys.filter((k) => k.isDefault);
    const o = missingKeys.filter((k) => !k.isDefault);
    console.log(`Keys: ${keysUsed.length} used${dynamicKeys ? ` (+${dynamicKeys} dynamic, not checkable)` : ''}${keyNote ? ` · ${keyNote}` : d.length ? ` · ${d.length} missing in the default locale` : ' · all present in the default locale ✓'}${o.length ? ` · ${o.length} missing in other locales` : ''}`);
    for (const k of d) console.log(`  ${k.file}:${k.line} key "${k.key}" missing in ${k.locale} (default)`);
    for (const k of o) console.log(`  ${k.file}:${k.line} key "${k.key}" missing in ${k.locale}`);
  }
}
process.exit(bad ? 10 : 0);
