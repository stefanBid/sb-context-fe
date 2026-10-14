// The logic of rename-prefix.mjs, without I/O: which prefix the style uses and how to rename it.

/** The current prefix, from `@utility <p>-h1` / `@utility <p>-body` in the global CSS. */
export const detectPrefix = (cssText) => cssText.match(/@utility\s+([a-z][a-z0-9]{1,3})-(?:h1|body)\b/)?.[1] ?? null;

/** Whether the new prefix is already taken by variables or utilities of the CSS. */
export const prefixInUse = (cssText, to) => new RegExp(`--${to}-|@utility\\s+${to}-`).test(cssText);

/** The utility names (without prefix) defined with `@utility <from>-*`. */
export const utilityNames = (cssText, from) => [...cssText.matchAll(new RegExp(`@utility\\s+${from}-([\\w-]+)`, 'g'))].map((m) => m[1]);

/**
 * Renames --<from>-*, the known <from>-<utility> classes (also after variants such as lg:) and the
 * `Prefix "<from>"` headers. rename(src) → { out, n }; others(text) → identifiers starting with
 * <from>- that are not utilities of the style (left alone, listed for review).
 */
export function renamer(from, to, utilNames) {
  const alt = [...new Set(utilNames)].sort((a, b) => b.length - a.length).map((n) => n.replace(/[-]/g, '\\-')).join('|');
  const reVar = new RegExp(`(?<![\\w-])--${from}-`, 'g');
  const reUtil = new RegExp(`(?<![\\w-])${from}-(${alt})(?![\\w-])`, 'g');
  const reHeader = new RegExp(`(Prefix\\s+")${from}(")`, 'gi');
  const reOther = new RegExp(`(?<![\\w-])${from}-[\\w-]+`, 'g');
  const known = new Set(utilNames.map((n) => `${from}-${n}`));
  return {
    rename(src) {
      let n = 0;
      const out = src
        .replace(reVar, () => (n++, `--${to}-`))
        .replace(reUtil, (_, name) => (n++, `${to}-${name}`))
        .replace(reHeader, (_, a, b) => (n++, `${a}${to}${b}`));
      return { out, n };
    },
    others: (text) => [...text.matchAll(reOther)].map((m) => m[0]).filter((id) => !known.has(id)),
  };
}
