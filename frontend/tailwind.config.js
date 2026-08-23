/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nx: {
          bg: "#000000",
          elevated: "#0a0a0a",
          surface: "#111111",
          panel: "#161616",
          accent: "#00C2B3",
          cyan: "#00C2B3",
          muted: "#c8c8c8",
        },
        midnight: {
          950: "#06080f",
          900: "#0a0e17",
          800: "#0d121c",
          700: "#121826",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Montserrat",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: ["Montserrat", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 10px 40px -12px rgba(0, 194, 179, 0.45)",
        panel: "0 16px 48px -24px rgba(0, 0, 0, 0.65)",
      },
      backgroundImage: {
        "nx-hero":
          "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0,194,179,0.12), transparent 55%)",
      },
    },
  },
  plugins: [],
};
