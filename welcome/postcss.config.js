// Same pipeline as the internal app and the candidate portal. No explicit
// tailwind config path: the npm scripts run from the repo root, so Tailwind's
// own lookup finds the single tailwind.config.ts all three apps share (its
// `content` covers welcome/ too).
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
