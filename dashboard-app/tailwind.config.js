/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0f172a',
          lighter: '#1e293b',
          lightest: '#334155',
        },
        brand: {
          primary: '#3b82f6',
          secondary: '#10b981',
          accent: '#6366f1',
        }
      }
    },
  },
  plugins: [],
}
