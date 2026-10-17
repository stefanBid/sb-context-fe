// The catalog of official docs the plugins know: the maintainers' own pages, one entry per package.
// /sb-core:context proposes from it the links that fit a project; the user keeps, drops or adds links,
// and the project's choice lives in .sb-context/docs.json. The catalog is only the seed and the fallback.
//
// Entry: { package, name, major, older, links }
//   major  the major version the links document (the latest when the entry was written)
//   older  where the docs of an older major live ({major} is replaced), or null: verify it before proposing it
//   links  [{ topic, title, url, usedBy?, when? }]
//          usedBy  the skills that open the link (plugin:skill)
//          when    profile keys the link applies to ({ kind: 'library' }, { 'framework.name': 'nuxt' }); a list is any of
//
// The id of a link is <package>:<topic>, unique in the catalog. Adding a package is adding an entry here.

const EXTRACT = 'sb-design:extract-ui';
const ALIGN = 'sb-design:align';
const SEO = 'sb-health:seo';
const DEPS = 'sb-health:deps';

const NUXT = 'https://nuxt.com/docs/4.x';

export const CATALOG = [
  {
    package: 'nuxt',
    name: 'Nuxt',
    major: 4,
    older: 'https://nuxt.com/docs/{major}.x',
    links: [
      { topic: 'pages', title: 'Pages, dynamic routes and middleware', url: `${NUXT}/directory-structure/app/pages`, usedBy: [EXTRACT] },
      { topic: 'routing', title: 'Routing', url: `${NUXT}/getting-started/routing`, usedBy: [EXTRACT] },
      { topic: 'components', title: 'Components and auto-imports', url: `${NUXT}/directory-structure/app/components`, usedBy: [EXTRACT] },
      { topic: 'composables', title: 'Composables', url: `${NUXT}/directory-structure/app/composables` },
      { topic: 'utils', title: 'Utils', url: `${NUXT}/directory-structure/app/utils` },
      { topic: 'plugins', title: 'Plugins', url: `${NUXT}/directory-structure/app/plugins` },
      { topic: 'layouts', title: 'Layouts', url: `${NUXT}/directory-structure/app/layouts`, usedBy: [EXTRACT] },
      { topic: 'transitions', title: 'Page and layout transitions', url: `${NUXT}/getting-started/transitions`, usedBy: [EXTRACT] },
      { topic: 'seo', title: 'SEO, meta tags and useSeoMeta', url: `${NUXT}/getting-started/seo-meta`, usedBy: [EXTRACT, SEO] },
      { topic: 'rendering', title: 'Rendering modes, prerender and routeRules', url: `${NUXT}/guide/concepts/rendering`, usedBy: [EXTRACT, SEO] },
      { topic: 'state', title: 'Shared state with useState', url: `${NUXT}/getting-started/state-management` },
      { topic: 'assets', title: 'Images, fonts and static assets', url: `${NUXT}/getting-started/assets`, usedBy: [EXTRACT] },
      { topic: 'public', title: 'The public/ folder', url: `${NUXT}/directory-structure/public` },
      { topic: 'server', title: 'Server routes (Nitro)', url: `${NUXT}/directory-structure/server` },
      { topic: 'config', title: 'nuxt.config.ts', url: `${NUXT}/directory-structure/nuxt-config`, usedBy: [ALIGN] },
      { topic: 'directory-structure', title: 'Directory structure', url: `${NUXT}/directory-structure` },
      { topic: 'api', title: 'API reference', url: `${NUXT}/api` },
      { topic: 'upgrade', title: 'Upgrade guide', url: `${NUXT}/getting-started/upgrade`, usedBy: [DEPS] },
    ],
  },
  {
    package: 'vue',
    name: 'Vue',
    major: 3,
    older: null,
    links: [
      { topic: 'script-setup', title: '<script setup>', url: 'https://vuejs.org/api/sfc-script-setup.html', usedBy: [EXTRACT] },
      { topic: 'reactivity', title: 'Reactivity fundamentals', url: 'https://vuejs.org/guide/essentials/reactivity-fundamentals.html' },
      { topic: 'composition-api', title: 'Composition API FAQ', url: 'https://vuejs.org/guide/extras/composition-api-faq.html' },
      { topic: 'props', title: 'Props', url: 'https://vuejs.org/guide/components/props.html', usedBy: [EXTRACT] },
      { topic: 'slots', title: 'Slots', url: 'https://vuejs.org/guide/components/slots.html', usedBy: [EXTRACT] },
      { topic: 'composables', title: 'Composables', url: 'https://vuejs.org/guide/reusability/composables.html' },
      { topic: 'typescript', title: 'TypeScript with the Composition API', url: 'https://vuejs.org/guide/typescript/composition-api.html' },
      { topic: 'api', title: 'API reference', url: 'https://vuejs.org/api/' },
    ],
  },
  {
    package: 'vite',
    name: 'Vite',
    major: 8,
    older: 'https://v{major}.vite.dev',
    links: [
      { topic: 'config', title: 'Configuring Vite', url: 'https://vite.dev/config/', usedBy: [ALIGN] },
      { topic: 'library-mode', title: 'Library mode', url: 'https://vite.dev/guide/build.html#library-mode', when: { kind: 'library' } },
      { topic: 'build', title: 'Building for production', url: 'https://vite.dev/guide/build.html', when: { kind: 'app' } },
      { topic: 'features', title: 'Features (CSS, assets, TypeScript)', url: 'https://vite.dev/guide/features.html' },
      { topic: 'env', title: 'Env variables and modes', url: 'https://vite.dev/guide/env-and-mode.html' },
      { topic: 'upgrade', title: 'Migration from the previous major', url: 'https://vite.dev/guide/migration.html', usedBy: [DEPS] },
    ],
  },
  {
    package: 'tailwindcss',
    name: 'Tailwind CSS',
    major: 4,
    older: 'https://v{major}.tailwindcss.com',
    links: [
      { topic: 'theme', title: 'Theme variables', url: 'https://tailwindcss.com/docs/theme', usedBy: [EXTRACT, ALIGN] },
      { topic: 'custom-styles', title: 'Adding custom styles', url: 'https://tailwindcss.com/docs/adding-custom-styles', usedBy: [ALIGN] },
      { topic: 'directives', title: 'Functions and directives', url: 'https://tailwindcss.com/docs/functions-and-directives', usedBy: [ALIGN] },
      { topic: 'dark-mode', title: 'Dark mode', url: 'https://tailwindcss.com/docs/dark-mode', usedBy: [ALIGN] },
      { topic: 'vite', title: 'Installing with Vite', url: 'https://tailwindcss.com/docs/installation/using-vite', when: { 'framework.name': 'vue' } },
      { topic: 'upgrade', title: 'Upgrade guide', url: 'https://tailwindcss.com/docs/upgrade-guide', usedBy: [DEPS] },
    ],
  },
  {
    package: 'vue-router',
    name: 'Vue Router',
    major: 5,
    older: null,
    links: [
      { topic: 'guide', title: 'Getting started', url: 'https://router.vuejs.org/guide/', usedBy: [EXTRACT] },
      { topic: 'dynamic-routes', title: 'Dynamic route matching', url: 'https://router.vuejs.org/guide/essentials/dynamic-matching.html', usedBy: [EXTRACT] },
      { topic: 'guards', title: 'Navigation guards', url: 'https://router.vuejs.org/guide/advanced/navigation-guards.html' },
      { topic: 'lazy-loading', title: 'Lazy loading routes', url: 'https://router.vuejs.org/guide/advanced/lazy-loading.html' },
    ],
  },
  {
    package: 'vue-i18n',
    name: 'Vue I18n',
    major: 11,
    older: null,
    links: [
      { topic: 'started', title: 'Getting started', url: 'https://vue-i18n.intlify.dev/guide/essentials/started.html', usedBy: [EXTRACT] },
      { topic: 'composition', title: 'Composition API', url: 'https://vue-i18n.intlify.dev/guide/advanced/composition.html', usedBy: [EXTRACT] },
    ],
  },
  {
    package: '@nuxtjs/i18n',
    name: 'Nuxt I18n',
    major: 10,
    older: null,
    links: [{ topic: 'started', title: 'Getting started, $t and useI18n', url: 'https://i18n.nuxtjs.org/docs/getting-started', usedBy: [EXTRACT] }],
  },
  { package: '@nuxt/icon', name: 'Nuxt Icon', major: 2, older: null, links: [{ topic: 'module', title: '@nuxt/icon', url: 'https://nuxt.com/modules/icon', usedBy: [EXTRACT] }] },
  { package: '@nuxt/image', name: 'Nuxt Image', major: 2, older: null, links: [{ topic: 'module', title: '@nuxt/image', url: 'https://nuxt.com/modules/image', usedBy: [EXTRACT] }] },
  { package: '@nuxt/fonts', name: 'Nuxt Fonts', major: 1, older: null, links: [{ topic: 'module', title: '@nuxt/fonts', url: 'https://nuxt.com/modules/fonts', usedBy: [ALIGN] }] },
  { package: '@nuxtjs/color-mode', name: 'Nuxt Color Mode', major: 4, older: null, links: [{ topic: 'module', title: '@nuxtjs/color-mode', url: 'https://nuxt.com/modules/color-mode', usedBy: [ALIGN] }] },
  { package: '@nuxtjs/sitemap', name: 'Nuxt Sitemap', major: 9, older: null, links: [{ topic: 'module', title: '@nuxtjs/sitemap', url: 'https://nuxt.com/modules/sitemap', usedBy: [SEO] }] },
  { package: '@nuxt/eslint', name: 'Nuxt ESLint', major: 1, older: null, links: [{ topic: 'module', title: '@nuxt/eslint', url: 'https://nuxt.com/modules/eslint' }] },
  { package: '@vueuse/nuxt', name: 'VueUse', major: 15, older: null, links: [{ topic: 'module', title: '@vueuse/nuxt', url: 'https://nuxt.com/modules/vueuse' }] },
  {
    package: '@vueuse/core',
    name: 'VueUse',
    major: 15,
    older: null,
    links: [
      { topic: 'functions', title: 'Functions', url: 'https://vueuse.org/functions.html' },
      { topic: 'color-mode', title: 'useColorMode', url: 'https://vueuse.org/core/useColorMode/', usedBy: [ALIGN], when: { 'framework.name': 'vue', kind: 'app' } },
    ],
  },
  {
    package: 'pinia',
    name: 'Pinia',
    major: 4,
    older: null,
    links: [
      { topic: 'stores', title: 'Defining a store', url: 'https://pinia.vuejs.org/core-concepts/' },
      { topic: 'nuxt', title: 'Pinia with Nuxt', url: 'https://pinia.vuejs.org/ssr/nuxt.html', when: { 'framework.name': 'nuxt' } },
    ],
  },
  {
    package: 'vitest',
    name: 'Vitest',
    major: 5,
    older: null,
    links: [
      { topic: 'guide', title: 'Getting started', url: 'https://vitest.dev/guide/' },
      { topic: 'config', title: 'Configuring Vitest', url: 'https://vitest.dev/config/' },
    ],
  },
  {
    package: '@floating-ui/vue',
    name: 'Floating UI',
    major: 2,
    older: null,
    links: [
      { topic: 'vue', title: 'Vue: useFloating', url: 'https://floating-ui.com/docs/vue' },
      { topic: 'middleware', title: 'Middleware', url: 'https://floating-ui.com/docs/middleware' },
      { topic: 'auto-update', title: 'autoUpdate', url: 'https://floating-ui.com/docs/autoUpdate' },
      { topic: 'arrow', title: 'Arrow', url: 'https://floating-ui.com/docs/arrow' },
    ],
  },
  {
    package: '@floating-ui/dom',
    name: 'Floating UI',
    major: 1,
    older: null,
    links: [
      { topic: 'compute-position', title: 'computePosition', url: 'https://floating-ui.com/docs/computePosition' },
      { topic: 'middleware', title: 'Middleware', url: 'https://floating-ui.com/docs/middleware' },
      { topic: 'auto-update', title: 'autoUpdate', url: 'https://floating-ui.com/docs/autoUpdate' },
    ],
  },
  { package: 'vite-plugin-dts', name: 'vite-plugin-dts', major: 5, older: null, links: [{ topic: 'readme', title: 'Options', url: 'https://github.com/qmhc/unplugin-dts#readme', when: { kind: 'library' } }] },
  { package: 'unplugin-vue-components', name: 'unplugin-vue-components', major: 32, older: null, links: [{ topic: 'readme', title: 'Options', url: 'https://github.com/unplugin/unplugin-vue-components#readme', usedBy: [EXTRACT] }] },
  { package: 'unplugin-icons', name: 'unplugin-icons', major: 24, older: null, links: [{ topic: 'readme', title: 'Usage', url: 'https://github.com/unplugin/unplugin-icons#readme', usedBy: [EXTRACT] }] },
];
