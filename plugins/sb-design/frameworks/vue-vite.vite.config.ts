// Reference example: only the parts related to the global style.
// Every other option of the project stays as it was.
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],

  resolve: {
    // @/ points to src/: the @reference line of a component <style> uses it
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
