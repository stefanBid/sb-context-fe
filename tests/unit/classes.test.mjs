import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { splitVariants, rootOf, COLOR_ROOTS, classesFromExpression, remPx, lab, PREF, nearestColors, nearestTextRole, headingIssues } from '../../plugins/sb-design/skills/migrate/scripts/lib/classes.mjs';
import { parseColor } from '../../plugins/sb-design/skills/migrate/scripts/color.mjs';

test('splitVariants: variants, important marks, colons inside arbitrary values', () => {
  assert.deepEqual(splitVariants('p-4'), { variants: [], utility: 'p-4' });
  assert.deepEqual(splitVariants('md:hover:!bg-red-500'), { variants: ['md', 'hover'], utility: 'bg-red-500' });
  assert.deepEqual(splitVariants('text-sm!'), { variants: [], utility: 'text-sm' });
  assert.deepEqual(splitVariants('lg:bg-[url(https://a.b/c.png)]'), { variants: ['lg'], utility: 'bg-[url(https://a.b/c.png)]' });
  assert.deepEqual(splitVariants('[&:hover]:text-ink'), { variants: ['[&:hover]'], utility: 'text-ink' });
});

test('rootOf: the longest matching root, negative values, unknown roots', () => {
  const cases = {
    'bg-red-500': ['bg', 'red-500'],
    'border-t-red-500': ['border-t', 'red-500'],
    'border-x': ['border-x', ''],
    'rounded-tl-lg': ['rounded-tl', 'lg'],
    rounded: ['rounded', ''],
    'text-shadow-sm': ['text-shadow', 'sm'],
    'ring-offset-2': ['ring-offset', '2'],
    '-mt-4': [null, 'mt-4'],
    'tracking-tight': [null, 'tracking-tight'],
    'to-blue-500': ['to', 'blue-500'],
    'top-0': [null, 'top-0'],
  };
  for (const [u, [root, value]] of Object.entries(cases)) assert.deepEqual(rootOf(u), { root, value }, u);
  assert.ok(COLOR_ROOTS.has('border-t') && !COLOR_ROOTS.has('font') && !COLOR_ROOTS.has('rounded'));
});

test('classesFromExpression reads every string literal of a :class', () => {
  assert.deepEqual(classesFromExpression("[isOn ? 'bg-primary text-on-primary' : \"bg-surface\", `p-4`]"), ['bg-primary', 'text-on-primary', 'bg-surface', 'p-4']);
  assert.deepEqual(classesFromExpression("{ 'is-active': active, hidden: !open }"), ['is-active']);
  assert.deepEqual(classesFromExpression('`p-${size}`'), [], 'template strings with ${} are skipped');
});

test('remPx', () => {
  assert.equal(remPx('1.5rem'), 24);
  assert.equal(remPx(' 18px '), 18);
  assert.equal(remPx('1.5em'), null);
  assert.equal(remPx('18'), null);
});

test('nearestColors: by OKLab distance, preferred roles first', () => {
  const theme = ['#ffffff', '#f5f5f5', '#111111', '#0055ff', '#dd0000'].map((hex, i) => ({ name: ['surface', 'bg', 'ink', 'primary', 'error'][i], lab: lab(parseColor(hex)) }));
  assert.deepEqual(nearestColors(theme, parseColor('#fafafa'), 2), ['surface', 'bg']);
  assert.deepEqual(nearestColors(theme, parseColor('#ee0000'), 1), ['error']);
  assert.deepEqual(nearestColors(theme, parseColor('#fafafa'), 3, PREF.text), ['primary', 'ink', 'surface'], 'preferred roles among the 6 nearest come first, still by distance');
});

describe('nearestTextRole', () => {
  const roles = [
    { name: 'hero', px: null, clamp: true },
    { name: 'display', px: 56 }, { name: 'h1', px: 40 }, { name: 'h2', px: 30 }, { name: 'h3', px: 22 }, { name: 'h4', px: 18 },
    { name: 'lead', px: 19 }, { name: 'body', px: 16 }, { name: 'body-strong', px: 16 },
    { name: 'label', px: 14 }, { name: 'small', px: 14 }, { name: 'overline', px: 12 },
  ];

  test('headings pick heading roles, text picks text roles', () => {
    assert.deepEqual(nearestTextRole(roles, 19, { tag: 'h3' }), ['h4']);
    assert.deepEqual(nearestTextRole(roles, 19, { tag: 'p' }), ['lead']);
    assert.deepEqual(nearestTextRole(roles, 19, { tag: 'span', weight: 700 }), ['h4'], 'heavy and ≥ 17px reads as a heading');
    assert.deepEqual(nearestTextRole(roles, 19, { tag: 'span', display: true }), ['h4']);
    assert.deepEqual(nearestTextRole(roles, 20, { tag: 'h3' }), ['h3', 'h4'], 'equidistant headings');
  });

  test('roles of the same size: weight and tag decide', () => {
    assert.deepEqual(nearestTextRole(roles, 14, { tag: 'p' }), ['small']);
    assert.deepEqual(nearestTextRole(roles, 14, { tag: 'p', weight: 600 }), ['label']);
    assert.deepEqual(nearestTextRole(roles, 14, { tag: 'label' }), ['label']);
    assert.deepEqual(nearestTextRole(roles, 16, { tag: 'button' }), ['body-strong']);
    assert.deepEqual(nearestTextRole(roles, 16, { tag: 'p' }), ['body']);
  });

  test('overline only for uppercase text', () => {
    assert.deepEqual(nearestTextRole(roles, 12, { tag: 'span' }), ['small']);
    assert.deepEqual(nearestTextRole(roles, 13, { tag: 'span', uppercase: true }), ['overline']);
  });

  test('equidistant sizes return both roles', () => {
    assert.deepEqual(nearestTextRole(roles, 15, { tag: 'p' }), ['body', 'small']);
  });

  test('above the largest fixed role: hero when there is a clamp, else the largest', () => {
    assert.deepEqual(nearestTextRole(roles, 72, {}), ['hero']);
    assert.deepEqual(nearestTextRole(roles.filter((r) => !r.clamp), 72, {}), ['display']);
  });

  test('without ctx it reads as text', () => {
    assert.deepEqual(nearestTextRole(roles, 17), ['body']);
  });
});

test('headingIssues', () => {
  const outline = [{ line: 1, level: 1 }, { line: 3, level: 3 }, { line: 5, level: 1 }, { line: 6, level: 2 }];
  assert.deepEqual(headingIssues(outline, true), ['2 h1 in the page (lines 1, 5): one per page.', 'Line 3: h3 after h1, a level is skipped.']);
  assert.deepEqual(headingIssues(outline, false), ['Line 3: h3 after h1, a level is skipped.'], 'components may have several h1');
  assert.deepEqual(headingIssues([{ line: 1, level: 2 }, { line: 2, level: 1 }], true), [], 'going back up is fine');
});
