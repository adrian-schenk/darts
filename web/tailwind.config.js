/** @type {import('tailwindcss').Config} */
import animations from 'tailwindcss-animate';
import colors from 'tailwindcss/colors';

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        easy: '#22c55e',
        medium: '#f59e0b',
        hard: '#ef4444',
      },
    },
  },
  plugins: [animations],
}
