import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // The gstack tooling churns temp files under .gstack/ (gitignored, but Vite
    // only ignores node_modules and .git by default). A temp file that vanishes
    // between readdir and lstat makes chokidar emit an unhandled error event,
    // which takes the whole dev server down with UNKNOWN: lstat '.gstack/...'.
    watch: { ignored: ['**/.gstack/**'] },
  },
})
