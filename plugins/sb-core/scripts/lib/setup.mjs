// The logic of setup-state.mjs, without I/O: from what the project has, which skill to run next.

/** The plugins' own files in .sb-context/ and the skill that writes each (plugin:skill). */
export const LOCAL_FILES = {
  'settings.json': '/sb-core:setup',
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
 * state: { style: { files }, design: { source, applied }, github: { remote, cache, prTitleLint }, dependencyNotes: { open } }
 */
export function recommend(state) {
  const out = [];
  const add = (skill, why) => out.push({ skill, why });
  const missingStyle = STYLE_FILES.filter((f) => !state.style.files[f]);
  if (missingStyle.length) add('/sb-design:align', `the global style is not in the four-file structure (missing ${missingStyle.join(', ')})`);
  if (!state.design.source) add('/sb-design:extract-style', 'only if the design lives in Claude: no design snapshot yet');
  else if (!state.design.applied) add('/sb-design:align', 'a design snapshot exists but it was never applied (sync flow)');
  if (state.github.remote && !state.github.cache) add('/sb-github:admin', 'the GitHub repo was never audited (read-only init)');
  if (state.github.remote && !state.github.prTitleLint) add('/sb-github:checks', 'no PR title lint: release-please depends on the PR titles');
  if (state.dependencyNotes.open) add('/sb-health:deps', `${state.dependencyNotes.open} dependency note(s) still open`);
  return out;
}
