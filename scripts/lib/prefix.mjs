// The token/utility prefix of the global style (`--{p}-bg`, `{p}-h1`): rules shared by
// design-extract-style (which suggests one) and style-align (which validates and renames it).

// Tailwind utility roots: a prefix equal to one of them would collide with real utilities
export const RESERVED = new Set(['p', 'm', 'w', 'h', 'bg', 'text', 'font', 'border', 'rounded', 'shadow', 'flex', 'grid', 'gap', 'ring', 'top', 'size', 'col', 'row', 'sr', 'dark', 'ease', 'animate', 'inset', 'space', 'divide', 'outline', 'fill', 'stroke']);

/** null when the prefix is usable, otherwise the reason it is not. */
export function prefixError(p) {
  if (!/^[a-z][a-z0-9]{1,3}$/.test(p)) return `"${p}" is not a valid prefix: 2–4 lowercase letters or digits, starting with a letter, no hyphens.`;
  if (RESERVED.has(p)) return `"${p}" is a Tailwind utility root: choose another prefix.`;
  return null;
}

/** A proposal from the design's name ("PraticaSicura" → "ps"); always asked to the user afterwards. */
export function suggestPrefix(name) {
  if (!name) return null;
  const words = String(name || '').replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z]+/).filter(Boolean);
  if (!words.length) return null;
  let p = words.length === 1 ? words[0].slice(0, 2) : words.map((w) => w[0]).join('').slice(0, 4);
  p = p.toLowerCase();
  if (p.length < 2) p = (words[0] + 'x').slice(0, 2).toLowerCase();
  if (RESERVED.has(p)) p = (p + (words[0][1] ?? 'x')).slice(0, 4).toLowerCase();
  return p;
}

/** The prefix of an aligned style, from its utility names (`sb-h1`, `sb-body`), or null. */
export const prefixFromUtilities = (names) => [...names].map((u) => u.match(/^([a-z][a-z0-9]{1,3})-(?:h1|body)$/)?.[1]).find(Boolean) ?? null;
