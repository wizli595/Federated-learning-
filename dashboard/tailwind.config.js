/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["Fira Code", "monospace"],
        sans: ["Fira Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
