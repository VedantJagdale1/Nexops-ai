import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        brand: {
          50: '#effdf8',
          100: '#d8f9ec',
          200: '#b4f1dc',
          300: '#7ee2c6',
          400: '#43cbaa',
          500: '#20af90',
          600: '#148d75',
          700: '#13715f',
          800: '#145a4e',
          900: '#144a41',
        },
      },
      boxShadow: {
        soft: '0 20px 60px -32px rgb(15 23 42 / 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
