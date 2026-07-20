/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', '../../packages/ui-mobile/src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',
        muted: '#f1f5f9',
        border: '#e2e8f0',
      },
    },
  },
  plugins: [],
};
