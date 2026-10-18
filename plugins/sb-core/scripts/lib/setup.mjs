// The logic of setup-state.mjs, without I/O: from what the project has, which skill to run next.

/** The plugins' own files in .sb-context/ and the skill that writes each (plugin:skill). */
export const LOCAL_FILES = {
  'profile.json': '/sb-core:setup',
  'settings.json': '/sb-core:setup',
  'docs.json': '/sb-core:context',
  'design-source.md': '/sb-design:extract-style',
  'design-applied.json': '/sb-design:align',
  'design-map.json': '/sb-design:align',
  'dependency-notes.json': '/sb-health:deps',
  'github.json': '/sb-github:admin',
};

/** The four files of the global style. */
export const STYLE_FILES = ['main.css', 'theme.css', 'typography.css', 'animation.css'];

/** A GitHub remote URL (https or ssh) from the text of .git/config, or null. */
export function githubRemoteOf(gitConfig) {
  const origin = gitConfig.match(/\[remote "origin"\]([\s\S]*?)(?=\n\[|$)/)?.[1] ?? '';
  return origin.match(/url\s*=\s*(\S*github\.com[:/]\S+)/)?.[1] ?? null;
}

/**
 * Next steps, in the order they make sense. Recommendations only: setup never runs them.
 * state: { profile?: { kind, adapter }, style: { files }, design: { source, applied }, docLinks?: { saved, claudeBlock }, github: { remote, cache, prTitleLint }, dependencyNotes: { open } }
 * The style steps are listed only for a project sb-design applies to (an app on a stack it has an adapter for).
 */
export function recommend(state) {
  const out = [];
  const add = (skill, why) => out.push({ skill, why });
  const design = !state.profile || (state.profile.kind === 'app' && DESIGN_ADAPTERS.includes(state.profile.adapter));
  const missingStyle = STYLE_FILES.filter((f) => !state.style.files[f]);
  if (design && missingStyle.length) add('/sb-design:align', `the global style is not in the four-file structure (missing ${missingStyle.join(', ')})`);
  if (design && !state.design.source) add('/sb-design:extract-style', 'only if the design lives in Claude: no design snapshot yet');
  else if (design && !state.design.applied) add('/sb-design:align', 'a design snapshot exists but it was never applied (sync flow)');
  if (state.docLinks && !state.docLinks.saved) add('/sb-core:context', 'no project docs chosen yet: the skills fall back on the catalog of official docs');
  else if (state.docLinks && !state.docLinks.claudeBlock) add('/sb-core:context', 'the project docs are saved but CLAUDE.md does not point to them');
  if (state.github.remote && !state.github.cache) add('/sb-github:admin', 'the GitHub repo was never audited (read-only init)');
  if (state.github.remote && !state.github.prTitleLint) add('/sb-github:checks', 'no PR title lint: release-please depends on the PR titles');
  if (state.dependencyNotes.open) add('/sb-health:deps', `${state.dependencyNotes.open} dependency note(s) still open`);
  return out;
}

// --- which plugins this project needs ---------------------------------------------------------------

/** The plugins of the marketplace a project can turn on or off (the bundle only installs them). */
export const PLUGINS = ['sb-core', 'sb-github', 'sb-health', 'sb-design'];

/** The skills of each plugin, as the user types them. */
export const SKILLS = {
  'sb-core': ['/sb-core:setup', '/sb-core:context', '/sb-core:onboard', '/sb-core:migration'],
  'sb-github': ['/sb-github:admin', '/sb-github:checks'],
  'sb-health': ['/sb-health:checkup', '/sb-health:build', '/sb-health:lint', '/sb-health:deps', '/sb-health:docs', '/sb-health:seo'],
  'sb-design': ['/sb-design:align', '/sb-design:migrate', '/sb-design:extract-style', '/sb-design:extract-ui', '/sb-design:check'],
};

/** The stacks sb-design has an adapter for. A project on another stack keeps it off until its adapter exists. */
export const DESIGN_ADAPTERS = ['nuxt', 'vue-vite'];

/**
 * For each plugin: whether this project needs it, and why. A recommendation only: the user decides.
 * profile: the project profile (kind, adapter, rendering); github: whether the repo has a GitHub remote.
 */
export function pluginPlan(profile, { github = false } = {}) {
  const kind = profile?.kind ?? null;
  const design =
    kind === 'library' ? [false, 'a library has no global style of its own to align']
    : kind !== 'app' ? [false, 'the kind of project is unknown: confirm it first']
    : !DESIGN_ADAPTERS.includes(profile.adapter) ? [false, `no adapter for ${profile.adapter ?? 'this stack'} yet (sb-design supports ${DESIGN_ADAPTERS.join(', ')})`]
    : [true, 'an app with a global style'];
  const seo = kind === 'library' || profile?.rendering === 'csr' ? ' (seo does not apply: no server-rendered pages)' : '';
  return [
    { plugin: 'sb-core', recommended: true, why: 'the project folder and settings every plugin reads' },
    { plugin: 'sb-github', recommended: github, why: github ? 'the repo has a GitHub remote' : 'no GitHub remote' },
    { plugin: 'sb-health', recommended: true, why: `build, lint, dependencies and docs apply to every project${seo}` },
    { plugin: 'sb-design', recommended: design[0], why: design[1] },
  ];
}

/** The skills worth listing for this project: those of the recommended plugins, minus the ones that do not apply. */
export function skillsFor(plan, profile) {
  const skip = new Set(profile?.kind === 'library' || profile?.rendering === 'csr' ? ['/sb-health:seo'] : []);
  if (profile?.kind !== 'app' || !DESIGN_ADAPTERS.includes(profile?.adapter)) skip.add('/sb-core:onboard');
  return plan.filter((p) => p.recommended).flatMap((p) => SKILLS[p.plugin]).filter((s) => !skip.has(s));
}

/** A plugin id (`name@marketplace`) of this marketplace's plugins, or an error message. */
export function pluginIdError(id) {
  const m = /^([a-z0-9-]+)@([A-Za-z0-9._-]+)$/.exec(id ?? '');
  if (!m) return `"${id}" is not a plugin id (name@marketplace, as Claude Code lists it).`;
  if (!PLUGINS.includes(m[1])) return `"${id}" is not one of ${PLUGINS.join(', ')}: this script only turns these on or off.`;
  return null;
}

/** settings.local.json with enabledPlugins[id] set to value (true/false), or removed when value is null. */
export function withPlugin(settings, id, value) {
  const out = structuredClone(settings ?? {});
  out.enabledPlugins = { ...(out.enabledPlugins ?? {}) };
  if (value === null) delete out.enabledPlugins[id];
  else out.enabledPlugins[id] = value;
  if (!Object.keys(out.enabledPlugins).length) delete out.enabledPlugins;
  return out;
}
