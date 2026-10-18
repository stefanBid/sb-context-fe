// Reference example: src/composables/useTheme.ts. Call useTheme() once in App.vue (<script setup>);
// a theme switch imports it too and sets the returned mode to 'light', 'dark' or 'auto'.
import { useColorMode } from '@vueuse/core'

export const useTheme = () =>
  useColorMode({
    attribute: 'data-theme', // writes data-theme="light|dark" on <html>
    storageKey: 'color-mode', // the key the inline script of index.html reads: change both or neither
    initialValue: 'auto', // stored as 'auto' (follows the system), 'light' or 'dark'
  })
