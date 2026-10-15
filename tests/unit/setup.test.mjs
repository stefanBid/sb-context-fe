import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, githubRemoteOf, STYLE_FILES } from '../../scripts/lib/setup.mjs';

const allStyle = Object.fromEntries(STYLE_FILES.map((f) => [f, true]));
const base = () => ({
  style: { files: { ...allStyle } },
  design: { source: true, applied: true },
  github: { remote: 'git@github.com:a/b.git', cache: true, prTitleLint: true },
  dependencyNotes: { open: 0 },
});
const skills = (s) => recommend(s).map((r) => r.skill);

describe('recommend', () => {
  test('an aligned, audited project needs nothing', () => {
    assert.deepEqual(recommend(base()), []);
  });

  test('missing style files point to style-align and name them', () => {
    const s = base();
    s.style.files['animation.css'] = false;
    const [r] = recommend(s);
    assert.equal(r.skill, 'style-align');
    assert.match(r.why, /missing animation\.css/);
  });

  test('design: no snapshot → design-extract-style (optional); snapshot never applied → style-align', () => {
    const s = base();
    s.design = { source: false, applied: false };
    assert.deepEqual(skills(s), ['design-extract-style']);
    assert.match(recommend(s)[0].why, /only if/);
    s.design = { source: true, applied: false };
    assert.deepEqual(skills(s), ['style-align']);
  });

  test('GitHub steps only with a GitHub remote', () => {
    const s = base();
    s.github = { remote: 'https://github.com/a/b.git', cache: false, prTitleLint: false };
    assert.deepEqual(skills(s), ['gh-admin', 'gh-checks']);
    s.github.remote = null;
    assert.deepEqual(skills(s), []);
  });

  test('open dependency notes point to dependency-check', () => {
    const s = base();
    s.dependencyNotes.open = 2;
    assert.deepEqual(recommend(s), [{ skill: 'dependency-check', why: '2 dependency note(s) still open' }]);
  });

  test('order: style first, then design, GitHub, dependencies', () => {
    const s = { style: { files: {} }, design: { source: false, applied: false }, github: { remote: 'x', cache: false, prTitleLint: false }, dependencyNotes: { open: 1 } };
    assert.deepEqual(skills(s), ['style-align', 'design-extract-style', 'gh-admin', 'gh-checks', 'dependency-check']);
  });
});

describe('githubRemoteOf', () => {
  test('https and ssh origins on github.com', () => {
    assert.equal(githubRemoteOf('[core]\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/a/b.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n'), 'https://github.com/a/b.git');
    assert.equal(githubRemoteOf('[remote "origin"]\n\turl = git@github.com:a/b.git\n'), 'git@github.com:a/b.git');
  });

  test('no origin, another host, or github only on another remote → null', () => {
    assert.equal(githubRemoteOf(''), null);
    assert.equal(githubRemoteOf('[remote "origin"]\n\turl = https://gitlab.com/a/b.git\n'), null);
    assert.equal(githubRemoteOf('[remote "origin"]\n\turl = https://gitlab.com/a/b.git\n[remote "up"]\n\turl = https://github.com/a/b.git\n'), null);
  });
});
