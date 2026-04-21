import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f0ede8',
        surface: '#faf8f5',
        section: '#eae6e0',
        total: '#e8e0d4',
        ink: {
          DEFAULT: '#1c1814',
          muted: '#6b6158',
        },
        border: {
          DEFAULT: '#c8c0b4',
          strong: '#6b6158',
          input: '#b0a898',
        },
        accent: {
          DEFAULT: '#1a3a5c',
          dark: '#0d2a45',
          light: '#2a5080',
        },
        accent2: '#8b1a1a',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': '0.6875rem',
      },
      boxShadow: {
        topbar: '0 2px 8px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
} satisfies Config;
