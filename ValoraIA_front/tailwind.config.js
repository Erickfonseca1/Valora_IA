/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        primary: '#111827',
        'navy-deep': '#111827',
        gold: '#C9A227',
        'gold-tint': '#FEFCF5',
        'gold-border': '#E8D99A',
        parchment: '#F7F4EE',
        'border-warm': '#E8E0CF',
        accent: '#10B981',
      },
    },
  },
  plugins: [],
}
