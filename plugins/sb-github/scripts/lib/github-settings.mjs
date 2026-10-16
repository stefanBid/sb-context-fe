// The logic of github-settings.mjs, without I/O: which keys are preferences and which are cache,
// how a refresh compares the old value with the new one, and how old each part of the cache is.

import { dig } from '../../core/lib/settings.mjs';
import { daysSince } from '../../core/lib/time.mjs';

/** User-owned: changed only on request, never touched by a refresh. */
export const PREFERENCES = ['signature', 'defaults'];
/** Agent-owned: a snapshot of the remote, refreshed freely. */
export const CACHE = ['repo', 'labels', 'rulesets', 'ci', 'release', 'security'];
/** A part of the cache older than this is refreshed before a write. */
export const STALE_DAYS = 7;

// GitHub tokens (classic, OAuth, app, refresh, fine-grained): never stored
const TOKEN = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/;

function assertNoSecret(value, path) {
  const walk = (v) => {
    if (typeof v === 'string' && TOKEN.test(v)) throw new Error(`${path}: the value looks like a GitHub token. Store names and flags only, never tokens.`);
    if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
}

function topKey(path, allowed, kind, other) {
  const top = path.split('.')[0];
  if (allowed.includes(top)) return top;
  const hint = other.includes(top) ? ` "${top}" is ${kind === 'preference' ? 'cache: use refresh' : 'a preference: use set'}.` : '';
  throw new Error(`${path}: not a ${kind} key.${hint} ${kind === 'preference' ? 'Preferences' : 'Cache keys'}: ${allowed.join(', ')}.`);
}

// sets a dotted key, creating objects on the way (no stamps: the file keeps the documented shape)
function setDotted(data, path, value) {
  const keys = path.split('.');
  let o = data;
  for (const k of keys.slice(0, -1)) o = o[k] = typeof o[k] === 'object' && o[k] !== null && !Array.isArray(o[k]) ? o[k] : {};
  o[keys.at(-1)] = value;
  return data;
}

/** A preference (signature, defaults), on the user's request. Signing needs a name. */
export function setPreference(data, path, value) {
  topKey(path, PREFERENCES, 'preference', CACHE);
  assertNoSecret(value, path);
  setDotted(data, path, value);
  const sig = data.signature;
  if (sig && typeof sig.enabled !== 'boolean') throw new Error('signature.enabled must be true or false.');
  if (sig?.enabled && !(typeof sig.name === 'string' && sig.name.trim())) throw new Error(`signature.enabled is true without a name: set both, e.g. set signature '{"enabled":true,"name":"<name>"}'.`);
  return data;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What a refresh changed: new, same, or changed (with added/removed items for lists, keys for objects). */
export function diffValue(before, after) {
  if (before === undefined) return { status: 'new' };
  if (same(before, after)) return { status: 'same' };
  if (Array.isArray(before) && Array.isArray(after)) {
    const has = (list, x) => list.some((y) => same(x, y));
    return { status: 'changed', added: after.filter((x) => !has(before, x)), removed: before.filter((x) => !has(after, x)) };
  }
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (isObj(before) && isObj(after)) {
    const changed = {};
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) if (!same(before[k], after[k])) changed[k] = { before: before[k] ?? null, after: after[k] ?? null };
    return { status: 'changed', changed };
  }
  return { status: 'changed', before, after };
}

/** Stores what was just read from the remote and stamps that part of the cache. Returns the diff. */
export function refreshCache(data, path, value, today) {
  const top = topKey(path, CACHE, 'cache', PREFERENCES);
  assertNoSecret(value, path);
  const diff = diffValue(dig(data, path), value);
  setDotted(data, path, value);
  data.checked = { ...data.checked, [top]: today };
  data.checkedAt = today;
  return diff;
}

/** How much is known: signature asked or not, and for each part of the cache its age. */
export function status(data, now = Date.now()) {
  const cache = Object.fromEntries(
    CACHE.map((k) => {
      const checked = data.checked?.[k] ?? (data[k] !== undefined ? data.checkedAt : null) ?? null;
      const ageDays = checked ? daysSince(checked, now) : null;
      return [k, { known: data[k] !== undefined, checked, ageDays, stale: data[k] !== undefined && (ageDays === null || ageDays > STALE_DAYS) }];
    }),
  );
  return {
    signature: data.signature ? { asked: true, ...data.signature } : { asked: false },
    defaults: data.defaults ?? null,
    cache,
    missing: CACHE.filter((k) => !cache[k].known),
    stale: CACHE.filter((k) => cache[k].stale),
    staleAfterDays: STALE_DAYS,
  };
}
