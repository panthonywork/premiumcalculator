/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'td-green': '#00843D',
        'td-green-dark': '#006B31',
        'td-green-light': '#E8F5ED',
        'td-green-muted': '#D0EAD9',
      },
    },
  },
  plugins: [],
}
