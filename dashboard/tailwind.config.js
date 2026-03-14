/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["Fira Code", "monospace"],
        sans: ["Fira Sans", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-left": {
          "0%":   { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "value-flash": {
          "0%":   { color: "rgb(96 165 250)" },
          "100%": { color: "inherit" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0px 0px rgba(59,130,246,0)" },
          "50%":       { boxShadow: "0 0 12px 2px rgba(59,130,246,0.25)" },
        },
      },
      animation: {
        "fade-in-up":    "fade-in-up 0.25s ease-out both",
        "fade-in":       "fade-in 0.2s ease-out both",
        "slide-in-left": "slide-in-left 0.2s ease-out both",
        "scale-in":      "scale-in 0.2s ease-out both",
        "value-flash":   "value-flash 0.6s ease-out both",
        "glow-pulse":    "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
