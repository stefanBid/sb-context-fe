// Dates shared by the plugins' scripts.

/** Whole days from an ISO date to now (never negative). */
export const daysSince = (from, now = Date.now()) => Math.max(0, Math.floor((now - Date.parse(from)) / 86400000));
