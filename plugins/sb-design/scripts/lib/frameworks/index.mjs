// sb-design's framework adapters: what the scripts need to know about a stack (where the global style is
// registered, how aliases resolve, how color mode and fonts are set up). One module per adapter of the
// profile (core/lib/profile.mjs adapterOf); its rules for the model are in frameworks/<name>.md.
//
// An adapter exports: name, IGNORE, MODULE_BASES, resolveAlias, cssEntries, p9, defaultCss, configTargets,
// fontNote, styleSetup, projectLines. A new stack is a new module listed here, plus its frameworks/<name>.md.

import * as nuxt from './nuxt.mjs';
import * as vueVite from './vue-vite.mjs';

export const ADAPTERS = { nuxt, 'vue-vite': vueVite };
/** The adapters sb-design supports (sb-core's DESIGN_ADAPTERS must list the same ones). */
export const ADAPTER_NAMES = Object.keys(ADAPTERS);
/** Build folders no adapter walks, for scripts that run without a project (loose files). */
export const IGNORE_ANY = new Set(Object.values(ADAPTERS).flatMap((a) => [...a.IGNORE]));
/** Where postcss and Tailwind may be found, for scripts that run without a project. */
export const MODULE_BASES_ANY = [...new Set(Object.values(ADAPTERS).flatMap((a) => a.MODULE_BASES))];

/** The adapter of a profile, or null. */
export const adapterFor = (profile) => ADAPTERS[profile?.adapter] ?? null;
