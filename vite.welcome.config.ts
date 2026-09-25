import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * NourishOS New-Hire Welcome Portal — welcome-portal.md §3.1's "App 3".
 *
 * A separate app (own entry, own bundle, own deployment) but not a separate
 * npm package: it shares the repo's node_modules and the Basalt design tokens
 * in src/styles/globals.css, which is why `server.fs.allow` reaches the repo
 * root. Nothing under src/ is imported except that stylesheet — the welcome
 * app has no access to NourishOS's services, stores or components, and must
 * not gain any. Its own visual layer is welcome/src/glass.css (§9's scoped
 * Basalt exception), layered on top of those tokens.
 */
export default defineConfig({
  root: path.resolve(__dirname, 'welcome'),
  // Its own dep cache, for the reason vite.portal.config.ts spells out: three
  // dev servers sharing node_modules/.vite/deps optimize different dep sets
  // into the same directory and clobber each other, and the surviving symptom
  // is "more than one copy of React" in whichever server did not write last.
  cacheDir: path.resolve(__dirname, 'node_modules/.vite-welcome'),
  // Same VITE_FIREBASE_* values as the other two apps — one Firebase project,
  // one .env.local, no third copy to drift.
  envDir: __dirname,
  plugins: [react()],
  server: {
    port: 5175,
    fs: { allow: [__dirname] },
    watch: { ignored: ['**/.gstack/**', '**/graphify-out/**'] },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-welcome'),
    emptyOutDir: true,
  },
})
