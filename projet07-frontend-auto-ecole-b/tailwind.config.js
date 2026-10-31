/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#50C786',
        success: '#50C786',
      },
      fontFamily: {
        'sans': ['Roboto', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        'display': ['Oswald', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        'serif': ['Libertinus Serif Display', 'Georgia', 'serif'],
        'smooch': ['Smooch Sans', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [require("daisyui")],
}

