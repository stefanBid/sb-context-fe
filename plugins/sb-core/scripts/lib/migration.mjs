// The logic of migrate-v1.mjs, without I/O: what changes from sb-context-nuxt 0.x to sb-context-fe 1.0.

/** Files of .sb-context-nuxt/ that change name in .sb-context/. Every other file keeps its name. */
export const FILE_RENAMES = {
  'project-settings.json': 'settings.json',
  'github_settings.json': 'github.json',
};

/** Every skill of sb-context-nuxt 0.6 and where it lives in 1.0 (plugin:skill). */
export const SKILL_RENAMES = {
  setup: 'sb-core:setup',
  onboard: 'sb-core:onboard',
  'gh-admin': 'sb-github:admin',
  'gh-checks': 'sb-github:checks',
  'build-check': 'sb-health:build',
  'lint-check': 'sb-health:lint',
  'dependency-check': 'sb-health:deps',
  'docs-update': 'sb-health:docs',
  'seo-check': 'sb-health:seo',
  'full-checkup': 'sb-health:checkup',
  'style-align': 'sb-design:align',
  'style-migrate': 'sb-design:migrate',
  'design-extract-style': 'sb-design:extract-style',
  'design-extract-ui': 'sb-design:extract-ui',
};

/** The new name of a file moved from .sb-context-nuxt/ to .sb-context/. */
export const newFileName = (name) => FILE_RENAMES[name] ?? name;

const SKILL_RE = new RegExp(`(/?)sb-context-nuxt:(${Object.keys(SKILL_RENAMES).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');

/**
 * Rewrites the references to sb-context-nuxt 0.x in a project text (CLAUDE.md, README, .claude/settings.json…):
 * skill commands, the plugin id in enabledPlugins, the folder and its renamed files.
 * Returns the new text and one entry per kind of change, with how many times it occurred.
 */
export function rewriteRefs(text) {
  const changes = {};
  const count = (from, to) => (changes[`${from} → ${to}`] = (changes[`${from} → ${to}`] ?? 0) + 1);
  let out = text.replace(SKILL_RE, (m, slash, skill) => {
    const to = `${slash}${SKILL_RENAMES[skill]}`;
    count(m, to);
    return to;
  });
  out = out.replace(/sb-context-nuxt@sb-context-nuxt/g, (m) => {
    count(m, 'sb-context-fe@sb-context-fe');
    return 'sb-context-fe@sb-context-fe';
  });
  for (const [from, to] of Object.entries(FILE_RENAMES))
    out = out.replace(new RegExp(`\\.sb-context-nuxt/${from.replace('.', '\\.')}`, 'g'), (m) => {
      count(m, `.sb-context/${to}`);
      return `.sb-context/${to}`;
    });
  out = out.replace(/\.sb-context-nuxt\b/g, (m) => {
    count(m, '.sb-context');
    return '.sb-context';
  });
  return { text: out, changes: Object.entries(changes).map(([change, times]) => ({ change, times })) };
}

/** .git/info/exclude without the line that kept .sb-context-nuxt/ out of git (both spellings). */
export function dropLegacyExclude(text) {
  const lines = text.split('\n');
  const kept = lines.filter((l) => !/^\/?\.sb-context-nuxt\/?\s*$/.test(l));
  return { text: kept.join('\n'), removed: lines.length - kept.length };
}

/** The gitdir of a worktree from the text of its `.git` file ("gitdir: <path>"), or null. */
export const gitdirOf = (dotGitFile) => dotGitFile.match(/^gitdir:\s*(.+?)\s*$/m)?.[1] ?? null;
