// The logic of setup-state.mjs, without I/O: from what the project has, which skill to run next.

/** The plugin's own files in .sb-context-nuxt/ and the skill that writes each. */
export const LOCAL_FILES = {
  'project-settings.json': 'onboard',
  'design-source.md': 'design-extract-style',
  'design-applied.json': 'style-align',
  'design-map.json': 'style-align',
  'dependency-notes.json': 'dependency-check',
  'github_settings.json': 'gh-admin',
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
 * state: { style: { files }, design: { source, applied }, github: { remote, cache, prTitleLint }, dependencyNotes: { open } }
 */
export function recommend(state) {
  const out = [];
  const add = (skill, why) => out.push({ skill, why });
  const missingStyle = STYLE_FILES.filter((f) => !state.style.files[f]);
  if (missingStyle.length) add('style-align', `the global style is not in the four-file structure (missing ${missingStyle.join(', ')})`);
  if (!state.design.source) add('design-extract-style', 'only if the design lives in Claude: no design snapshot yet');
  else if (!state.design.applied) add('style-align', 'a design snapshot exists but it was never applied (sync flow)');
  if (state.github.remote && !state.github.cache) add('gh-admin', 'the GitHub repo was never audited (read-only init)');
  if (state.github.remote && !state.github.prTitleLint) add('gh-checks', 'no PR title lint: release-please depends on the PR titles');
  if (state.dependencyNotes.open) add('dependency-check', `${state.dependencyNotes.open} dependency note(s) still open`);
  return out;
}
