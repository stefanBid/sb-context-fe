import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, withExampleStyle, SCRIPTS } from '../helpers/fixture.mjs';
import { extract, tokens, machine, SOURCE } from '../helpers/design.mjs';
import { rng } from '../helpers/random.mjs';

const THEME = 'app/assets/css/theme.css';
const TYPO = 'app/assets/css/typography.css';
const ROUNDS = 8;

/** A random edit of the sample design: colors, radii, shadows, type sizes, weights, tracking, mobile sizes. */
function mutate(r) {
  const t = tokens();
  for (const c of r.sample(t.color.tokens.filter((x) => !/^\{/.test(x.value.light)), r.int(1, 6))) c.value = { light: r.hex(), dark: r.hex() };
  for (const x of r.sample(t.radius.tokens.filter((x) => x.name !== 'radius-full'), r.int(0, 2))) x.value = `${r.int(2, 32)}px`;
  for (const x of r.sample(t.shadow.tokens, r.int(0, 2))) x.value = { light: `0 ${r.int(1, 20)}px ${r.int(1, 40)}px rgba(0, 0, 0, 0.${r.int(1, 9)})`, dark: `0 ${r.int(1, 20)}px ${r.int(1, 40)}px rgba(0, 0, 0, 0.${r.int(1, 9)})` };
  const styles = t.type.groups.flatMap((g) => g.styles);
  for (const s of r.sample(styles, r.int(1, 5))) {
    s.fontSize = `${r.int(12, 64)}px`;
    s.lineHeight = `${r.int(16, 72)}px`;
    s.fontWeight = r.pick([400, 600, 700]);
    if (s.letterSpacing) s.letterSpacing = `${r.pick(['-', ''])}0.0${r.int(1, 9)}em`;
    if (/Mobile:/.test(s.usage ?? '')) s.usage = `Title. Mobile: ${r.int(20, 40)}px / ${r.int(24, 48)}px.`;
  }
  return t;
}

test('sync-values: after --apply the style is aligned, and a second --apply changes nothing', () => {
  const r = rng();
  const p = withExampleStyle(makeProject());
  try {
    for (let i = 0; i < ROUNDS; i++) {
      const t = mutate(r);
      assert.equal(extract(p, t).code, 0);
      const ctx = `seed ${r.seed}, round ${i}`;
      const applied = p.run(SCRIPTS.syncValues, ['--apply']);
      assert.equal(applied.code, 0, `${ctx}: ${applied.stderr}`);
      const check = p.run(SCRIPTS.syncValues, ['--check']);
      assert.equal(check.code, 0, `${ctx}: still drifting after --apply\n${check.stdout}`);
      const before = [p.read(THEME), p.read(TYPO)];
      p.run(SCRIPTS.syncValues, ['--apply']);
      assert.deepEqual([p.read(THEME), p.read(TYPO)], before, `${ctx}: second --apply rewrote the files`);
    }
  } finally {
    p.cleanup();
  }
});

test('tokens-to-source: full coverage and the same file for the same tokens, whatever the design', () => {
  const r = rng();
  const p = makeProject();
  try {
    for (let i = 0; i < ROUNDS * 2; i++) {
      const t = mutate(r);
      // names outside the fixed set, aliases (some unresolvable), a third theme, extra token groups
      for (let k = r.int(0, 3); k > 0; k--) t.color.tokens.push({ name: `extra-${k}`, value: { light: r.pick([r.hex(), '{primary}', '{missing}', 'blue']), dark: r.hex() }, usage: r.pick(['', 'Page background.', 'Cards.']) });
      if (r.chance(0.3)) t.color.themes.push({ id: 'contrast' });
      if (r.chance(0.3)) t[`group${i}`] = { tokens: [{ name: 'x', value: '1' }] };
      if (r.chance(0.3)) delete t.shadow;
      const ctx = `seed ${r.seed}, round ${i}`;
      const first = extract(p, t);
      assert.equal(first.code, 0, `${ctx}: ${first.stderr}`);
      assert.match(first.stdout, /Coverage \(read → written\):.* ✓/, ctx);
      const md = p.read(SOURCE);
      assert.equal(Object.keys(machine(md).colors).length, t.color.tokens.length, ctx);
      extract(p, t);
      assert.equal(p.read(SOURCE), md, `${ctx}: not deterministic`);
    }
  } finally {
    p.cleanup();
  }
});

test('rename-prefix: a round trip gives back the same files', () => {
  const r = rng();
  const p = withExampleStyle(makeProject({ 'app/components/Hero.vue': '<template><h1 class="sb-h1 lg:sb-display sb-card">x</h1></template>\n<style>.x { color: var(--sb-primary); }</style>\n' }));
  try {
    const files = [THEME, TYPO, 'app/assets/css/main.css', 'app/assets/css/animation.css', 'app/components/Hero.vue'];
    const before = files.map((f) => p.read(f));
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < ROUNDS; i++) {
      let to;
      do to = r.pick(letters) + Array.from({ length: r.int(1, 3) }, () => r.pick(letters + '0123456789')).join('');
      while (to === 'sb' || ['bg', 'sr', 'row', 'col', 'top', 'gap', 'fill', 'grid', 'flex', 'ring', 'size', 'text', 'font', 'dark', 'ease'].includes(to));
      const ctx = `seed ${r.seed}, round ${i}: sb → ${to}`;
      assert.equal(p.run(SCRIPTS.renamePrefix, ['--to', to, '--apply']).code, 0, ctx);
      assert.equal(p.run(SCRIPTS.renamePrefix, ['--to', 'sb', '--apply']).code, 0, ctx);
      assert.deepEqual(files.map((f) => p.read(f)), before, ctx);
    }
  } finally {
    p.cleanup();
  }
});
