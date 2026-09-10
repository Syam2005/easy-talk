/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: "#0B0E1A",
          900: "#0F1424",
          800: "#161C33",
          700: "#212A47",
          600: "#2E3A61",
        },
        signal: {
          500: "#6C63FF",
          400: "#8B84FF",
        },
        amber: {
          400: "#FBBF6B",
          500: "#F4A93F",
        },
        mist: "#A9B1D6",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        chat: "18px",
      },
    },
  },
  plugins: [],
};
