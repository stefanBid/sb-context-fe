// The logic of dependency-notes.mjs, without I/O: blockers, note updates, ages.

import { daysSince } from '../../core/lib/time.mjs';

export const STATUSES = ['deferred', 'watching', 'resolved'];
export const OWNERS = ['upstream', 'project'];

// "i18n@^9:upstream" → { package, range, owner }; the last ":" splits the owner, the last "@" (not at 0) the range
export function parseBlocker(raw) {
  const cut = raw.lastIndexOf(':');
  const owner = cut === -1 ? '' : raw.slice(cut + 1);
  if (!OWNERS.includes(owner)) throw new Error(`--blocked-by "${raw}": end it with :upstream or :project (who has to change something).`);
  const spec = raw.slice(0, cut);
  const at = spec.lastIndexOf('@');
  return at > 0 ? { package: spec.slice(0, at), range: spec.slice(at + 1), owner } : { package: spec, range: null, owner };
}

export { daysSince };

/** A note as printed: with how long it has been open and since it was last checked. */
export const view = (n, now = Date.now()) => ({ ...n, openDays: n.status === 'resolved' ? null : daysSince(n.firstSeen, now), sinceLastCheckDays: daysSince(n.lastChecked, now) });

/**
 * Creates the note <package>@<target>, or replaces the one with the same id keeping its first-seen
 * date, its history and (unless given) its current version. Returns { notes, note }.
 */
export function upsertNote(notes, { pkg, target, status = 'deferred', summary, recheck, current = null, blockedBy = [], links = [] }, today) {
  if (!STATUSES.includes(status) || status === 'resolved') throw new Error('--status must be deferred or watching (use "resolve" to close a note).');
  const id = `${pkg}@${target}`;
  const prev = notes.find((n) => n.id === id);
  const note = {
    id,
    package: pkg,
    current: current ?? prev?.current ?? null,
    target,
    status,
    summary,
    blockedBy: blockedBy.map(parseBlocker),
    recheck,
    links,
    firstSeen: prev?.firstSeen ?? today,
    lastChecked: today,
    history: prev?.history ?? [],
  };
  return { notes: prev ? notes.map((n) => (n.id === id ? note : n)) : [...notes, note], note };
}

/** touch (still pending) or resolve (closed): updates the note in place. */
export function recordCheck(note, { text = null, resolve = false }, today) {
  if (resolve && !text) throw new Error('resolve needs --resolution "<how it ended>".');
  note.lastChecked = today;
  if (text) note.history = [...(note.history ?? []), { date: today, text }];
  if (resolve) {
    note.status = 'resolved';
    note.resolvedAt = today;
    note.resolution = text;
  }
  return note;
}
