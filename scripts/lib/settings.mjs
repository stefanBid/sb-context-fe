// The logic of project-settings.mjs, without I/O: dotted paths and what is read from nuxt.config.

export const dig = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);

/** A CLI value: JSON when it parses, otherwise the bare word as a string. */
export function parseValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Sets a dotted key, creating (or replacing scalars with) objects on the way.
 * A nested key stamps its top-level section with source and date; a top-level key is left as it is.
 */
export function setPath(settings, path, value, { source = 'user', date } = {}) {
  const keys = path.split('.');
  let o = settings;
  for (const k of keys.slice(0, -1)) o = o[k] = typeof o[k] === 'object' && o[k] !== null ? o[k] : {};
  o[keys.at(-1)] = value;
  if (keys.length > 1) {
    const section = settings[keys[0]];
    section.source = source;
    section.updatedAt = date;
  }
  return settings;
}

/** The i18n block of nuxt.config: default locale, locale codes (or plain strings), langDir. */
export function parseI18nConfig(cfg) {
  const i18nBlock = cfg.match(/i18n\s*:\s*\{([\s\S]*?)\n\s{0,2}\}/)?.[1] ?? '';
  const localeBlock = i18nBlock.match(/locales\s*:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
  const codes = [...localeBlock.matchAll(/code\s*:\s*['"]([\w-]+)['"]/g)].map((m) => m[1]);
  const locales = codes.length ? codes : [...localeBlock.matchAll(/['"]([a-z]{2}(?:-[A-Za-z]{2})?)['"]/g)].map((m) => m[1]);
  return {
    defaultLocale: i18nBlock.match(/defaultLocale\s*:\s*['"]([\w-]+)['"]/)?.[1] ?? null,
    locales,
    langDir: i18nBlock.match(/(?:langDir|restructureDir)\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null,
  };
}

/** Naming of components (paths relative to the components folder): name prefixes and subfolders. */
export function componentNaming(paths) {
  const prefixes = {};
  for (const c of paths) {
    const base = c.split('/').pop().replace('.vue', '');
    const m = base.match(/^(Base|App|Ui|The|U|Custom|Shared)(?=[A-Z])/);
    prefixes[m ? m[1] : 'none'] = (prefixes[m ? m[1] : 'none'] ?? 0) + 1;
  }
  const subfolders = [...new Set(paths.filter((c) => c.includes('/')).map((c) => c.split('/')[0]))];
  return { prefixes, subfolders };
}

/** The production URL, if nuxt.config declares one. */
export const siteUrlOf = (cfg) => cfg.match(/(?:siteUrl|baseUrl|site\.url|url)\s*:\s*['"](https?:\/\/[^'"]+)['"]/)?.[1] ?? null;

/** The style prefix of an aligned theme.css (`--sb-bg:`), or null. */
export const themePrefixOf = (css) => css.match(/--([a-z]{2,4})-bg\s*:/)?.[1] ?? null;
