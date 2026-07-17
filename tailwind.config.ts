import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1440px' }, // STYLE_GUIDE.md max content width
    },
    extend: {
      colors: {
        border: 'var(--color-border)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        surface: 'var(--color-surface)',
        sunken: 'var(--color-surface-sunken)', // STYLE_GUIDE.md § Sunken Surface — inputs, nested panels
        muted: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-muted-foreground)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        destructive: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)', // cards / dialogs per STYLE_GUIDE.md
      },
      fontFamily: {
        // STYLE_GUIDE.md § Typography (v2): DM Sans working font, Fraunces display, JetBrains Mono for IDs/logs
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'], // dashboard titles / welcome messages only
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      spacing: {
        // 8-point grid per STYLE_GUIDE.md — extends Tailwind's default scale, doesn't replace it
        18: '4.5rem',
        22: '5.5rem',
      },
      transitionDuration: {
        DEFAULT: '200ms', // STYLE_GUIDE.md motion: 150-250ms
      },
      boxShadow: {
        // STYLE_GUIDE.md § Shadows — warm-tinted, not neutral black
        card: '0 2px 10px rgba(80,55,30,.08)',
        dialog: '0 12px 40px rgba(80,55,30,.16)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
