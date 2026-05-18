/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        ui: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink: {
          50:  '#f7f5f0',
          100: '#ede9df',
          200: '#d9d1c0',
          300: '#c0b49a',
          400: '#a6956f',
          500: '#8c7a52',
          600: '#736240',
          700: '#5a4c32',
          800: '#3d3323',
          900: '#241e16',
          950: '#130f0b',
        },
        paper: {
          50:  '#fdfbf7',
          100: '#faf6ee',
          200: '#f4ecda',
          300: '#ecdfc0',
          400: '#e0cc9a',
        },
        accent: {
          DEFAULT: '#c0392b',
          light:   '#e74c3c',
          dark:    '#922b21',
        },
      },
      typography: (theme: (s: string) => string) => ({
        reading: {
          css: {
            '--tw-prose-body': theme('colors.ink.800'),
            '--tw-prose-headings': theme('colors.ink.900'),
            fontSize: '1.125rem',
            lineHeight: '1.9',
            fontFamily: theme('fontFamily.body'),
          },
        },
      }),
    },
  },
  plugins: [],
}
