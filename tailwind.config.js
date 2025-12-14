/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- THIS IS THE NEW LINE
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"Space Mono"', 'monospace'],
        round: ['"Varela Round"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}