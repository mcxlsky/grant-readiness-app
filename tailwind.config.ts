import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      colors: {
        cream: {
          50: "#faf8f5",
          100: "#f7f3ee",
          200: "#f0e8df",
        },
        plum: {
          50: "#e6dae8",
          100: "#d4c9d4",
          200: "#964db4",
          300: "#6c3484",
          400: "#5b2463",
          500: "#543e54",
          600: "#47174d",
          700: "#2f0f33",
          800: "#240c27",
          900: "#594659",
        },
        brand: {
          orange: "#ff5100",
          "orange-border": "#e64900",
          "orange-light": "#ff7a2e",
          "orange-deep": "#f03a00",
          "plum-drift": "#7a526e",
        },
        neutral: {
          950: "#0a0a0a",
        },
      },
      animation: {
        "fade-in": "fadeIn 300ms ease-out",
        "slide-up": "slideUp 350ms cubic-bezier(.4,0,.2,1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
