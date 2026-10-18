// Reference example: src/main.ts, only the imports related to the global style.
import { createApp } from 'vue'

// Fonts: Fontsource, one import per weight the text tokens use (static packages, not -variable:
// the variable ones rename the family, e.g. "Inter Variable", and typography.css would not match)
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

// The global style: only main.css (it imports theme, typography and animation)
import './assets/css/main.css'

import App from './App.vue'

createApp(App).mount('#app')
