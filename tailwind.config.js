/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'glass-50': 'rgba(255, 255, 255, 0.05)',
        'glass-100': 'rgba(255, 255, 255, 0.1)',
        'glass-200': 'rgba(255, 255, 255, 0.7)',
        'glass-border': 'rgba(255, 255, 255, 0.3)',
        'filled-text': '#292c37',
      },
      boxShadow: {
        'glass-lg': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      }
    },
  },
  plugins: [],
}
