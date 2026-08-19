// Same pipeline as the internal app. No explicit tailwind config path: the npm
// scripts run from the repo root, so Tailwind's own lookup finds the single
// tailwind.config.ts both apps share (its `content` covers portal/ too).
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
