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
        primary: '#3b82f6',
        'background-light': '#f8fafc',
        'background-dark': '#0f172a',
        'surface-light': '#ffffff',
        'surface-dark': '#1e293b',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}
