import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Nourish Career Portal — candidate_portal.md's "App 1".
 *
 * A separate app (own entry, own bundle, own hosting target) but not a separate
 * npm package: it shares the repo's node_modules and the Basalt design tokens
 * in src/styles/globals.css, which is why `server.fs.allow` reaches the repo
 * root. Nothing under src/ is imported except that stylesheet — the portal has
 * no access to NourishOS's services, stores or components by design.
 */
export default defineConfig({
  root: path.resolve(__dirname, 'portal'),
  // The portal reads the same VITE_FIREBASE_* values as the internal app —
  // one Firebase project, one .env.local, no second copy to drift.
  envDir: __dirname,
  plugins: [react()],
  server: {
    port: 5174,
    fs: { allow: [__dirname] },
    watch: { ignored: ['**/.gstack/**'] },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-portal'),
    emptyOutDir: true,
  },
})
