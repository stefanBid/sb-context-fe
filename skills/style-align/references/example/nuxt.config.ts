// Reference example: only the keys related to the global style.
// Every other key of the project stays as it was.
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxtjs/color-mode', '@nuxt/fonts'],

  // Nuxt 4: ~ points to app/, so the file lives in app/assets/css/main.css
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  colorMode: {
    preference: 'system', // follows the system until the user chooses
    fallback: 'light',
    dataValue: 'theme',   // writes data-theme="light|dark" on <html>
    classSuffix: '',
  },

  fonts: {
    // Families listed explicitly: names inside @theme are not always
    // detected automatically. Weights = those used by the text tokens.
    families: [
      { name: 'Poppins', provider: 'google', weights: ['600', '700'] },
      { name: 'Inter', provider: 'google', weights: ['400 700'] },
    ],
  },
})
