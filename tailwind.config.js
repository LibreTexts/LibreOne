/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './renderer/*.vue',
    './pages/**/*.vue',
    './components/**/*.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#127BC4",
        secondary: "#8553FE",
        accent: "#5F65F5",
        neutral: "#18181B",
        "base-100": "#2A303C",
        info: "#38BDF8",
        save: "#22c55e",
        success: "#338650",
        warning: "#BB5C21",
        error: "#DC3838",
        blue: {
          750: '#0B34D9',
        },
        sky: {
          550: '#179AEB',
        },
      },
      transitionProperty: {
        width: 'width',
      },
    },
  },
  plugins: [],
}
