import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"Cascadia Code"', 'monospace'],
      },
      /**
       * Dialog form typography. Roles, not pixels — so a size change happens
       * here once instead of drifting across component files.
       *
       * 13px is the floor: nothing on a dialog surface renders smaller.
       * Weight stays an explicit utility at the usage site, since baking it in
       * makes `font-*` overrides depend on Tailwind's emit order.
       *
       * See src/renderer/src/components/ui/field.tsx for the tiers.
       */
      fontSize: {
        section: ['13px', { lineHeight: '1rem', letterSpacing: '0.1em' }],
        label: ['14px', { lineHeight: '1.25rem' }],
        sub: ['13px', { lineHeight: '1.25rem' }],
        hint: ['13px', { lineHeight: '1.25rem' }],
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
      },
      backgroundImage: {
        grain: 'var(--texture-grain)',
      },
    },
  },
  plugins: [typography],
} satisfies Config;
