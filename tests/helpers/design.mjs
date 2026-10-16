// The sample Design System (tests/fixtures/design): same values as the reference aligned style
// in plugins/sb-design/skills/align/references/example, so an extraction of it is "aligned" with that style.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPTS, REPO } from './fixture.mjs';

export const DESIGN = join(REPO, 'tests/fixtures/design');
export const TOKENS = JSON.parse(readFileSync(join(DESIGN, 'tokens.json'), 'utf8'));
export const SOURCE = '.sb-context/design-source.md';

export const tokens = () => structuredClone(TOKENS);

/** The machine block of a design-source.md. */
export const machine = (md) => JSON.parse(md.match(/```json design-source\n([\s\S]*?)\n```/)[1]);

/** Writes tokens (the fixture, or a variant) into the project and runs the extraction. */
export function extract(p, t = TOKENS, extra = []) {
  p.write('design/tokens.json', t);
  return p.run(SCRIPTS.tokensToSource, ['--tokens', 'design/tokens.json', '--readme', join(DESIGN, 'README.md'), '--components-dir', DESIGN, '--source', 'https://claude.ai/artifact/x', '--version', '3', ...extra]);
}
