/** @type {import('tailwindcss').Config} */
import animations from 'tailwindcss-animate';

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [animations],
}
