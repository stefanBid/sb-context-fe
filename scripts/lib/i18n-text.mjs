// The heuristics of check-i18n.mjs, without I/O: what reads as user-visible text, and which
// message keys an expression uses.

export const READ_ATTRS = new Set(['alt', 'title', 'placeholder', 'aria-label', 'aria-description', 'aria-placeholder', 'label', 'summary']);
export const SKIP_TAGS = new Set(['style', 'svg', 'code', 'pre', 'path']);
const TEXT_KEYS = /\b(label|title|text|description|placeholder|caption|message|heading|subtitle|alt|tooltip|hint|cta|name)\s*:\s*$/;
const SEO_KEYS = /\b(title|description|ogTitle|ogDescription|twitterTitle|twitterDescription)\s*:\s*$/;
// Tailwind utilities that are a single plain word: in a class string they look like prose
const BARE_UTILITIES = new Set(['flex', 'grid', 'block', 'inline', 'hidden', 'contents', 'table', 'flow-root', 'relative', 'absolute', 'fixed', 'sticky', 'static', 'visible', 'invisible', 'collapse', 'isolate', 'container', 'grow', 'shrink', 'border', 'rounded', 'shadow', 'outline', 'ring', 'transition', 'transform', 'filter', 'blur', 'uppercase', 'lowercase', 'capitalize', 'italic', 'underline', 'overline', 'truncate', 'antialiased', 'ordinal', 'grayscale', 'invert', 'sepia', 'resize', 'snap', 'group', 'peer', 'prose', 'dark']);

/** Text tests; words in `allow` (brand names, proper nouns) never count as text. */
export function textRules(allow = []) {
  const hasText = (s) => {
    let t = String(s).replace(/&[a-z]+;|&#\d+;/gi, ' ');
    for (const a of allow) t = t.split(a).join(' ');
    return /\p{L}{2,}/u.test(t);
  };
  // every token looks like a utility: it has a utility mark (-, :, /, [ ], a digit…) or is a bare utility word
  const classLike = (s) => s.split(/\s+/).every((tok) => /[-:/\[\]()%!#.=_]|\d/.test(tok) || BARE_UTILITIES.has(tok) || /^[a-z]+$/.test(tok) === false && /^[A-Z]/.test(tok) === false && tok.length < 3);
  const isSentence = (s) => {
    const words = s.trim().split(/\s+/).filter((w) => /^[\p{L}'’.,;:!?()«»"-]{2,}$/u.test(w));
    return words.length >= 2 && !classLike(s) && hasText(s);
  };
  return { hasText, classLike, isSentence };
}

// the literal inside a one-string expression: 'x', "x", `x` (no ${})
export const literalOf = (exp) => {
  const m = /^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*$/.exec(exp ?? '');
  return m && !(m[1] === '`' && m[2].includes('${')) ? m[2] : null;
};

/** Literal keys of t('a.b') / $t('a.b') in an expression; template keys with ${} only counted. */
export function keysIn(exp) {
  const keys = [];
  let dynamic = 0;
  for (const m of exp.matchAll(/(?<![\w.$])\$?t\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) m[1] === '`' && m[2].includes('${') ? dynamic++ : keys.push(m[2]);
  return { keys, dynamic };
}

/** Inline text in one line of <script>: [{ kind: 'seo' | 'script text' | 'script string', text }]. */
export function scriptLineText(line, { hasText, isSentence }) {
  if (/i18n-ignore/.test(line) || /^\s*(import|export\s+type|type|interface)\b/.test(line)) return [];
  const out = [];
  for (const m of line.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const [, q, text] = m;
    if (q === '`' && text.includes('${')) continue;
    const before = line.slice(0, m.index);
    if (/(?<![\w.$])\$?t\(\s*$/.test(before) || /(?:keypath|key|path|href|to|src|id|class|type|name)\s*[:=]\s*$/.test(before) && !TEXT_KEYS.test(before)) continue;
    if (SEO_KEYS.test(before) && hasText(text)) out.push({ kind: 'seo', text });
    else if (TEXT_KEYS.test(before) && hasText(text)) out.push({ kind: 'script text', text });
    else if (isSentence(text) && !/^\s*(\/\/|\*)/.test(line)) out.push({ kind: 'script string', text });
  }
  return out;
}

/** Whether a locale object has a key, as a flat "a.b" entry or as nested objects. */
export const hasKey = (o, k) => k in o || k.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), o) !== undefined;
