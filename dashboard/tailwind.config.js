/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        taupe: {
          DEFAULT: "#8C7E6E",
          light: "#A89B8C",
          deep: "#6E6253",
        },
        ivory: "#F7F4EF",
        charcoal: "#3A352F",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
