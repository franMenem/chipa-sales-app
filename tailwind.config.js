/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: '#13ec5b',
        'background-light': '#f6f8f6',
        'background-dark': '#102216',
        'surface-light': '#ffffff',
        'surface-dark': '#1c2e24',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
