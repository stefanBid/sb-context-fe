// Seeded randomness: property tests explore many inputs but fail the same way on every run.
// The seed of a failing case is in the assertion message; SEED=<n> reruns from it.

export function rng(seed = Number(process.env.SEED ?? 20261014)) {
  let s = seed >>> 0;
  const next = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const hex = () => `#${[0, 0, 0].map(() => int(0, 255).toString(16).padStart(2, '0')).join('')}`;
  const sample = (list, n) => [...list].sort(() => next() - 0.5).slice(0, n);
  return { seed, next, int, pick, hex, sample, chance: (p) => next() < p };
}
