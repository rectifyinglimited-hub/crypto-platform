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
          accent: "#C8FF00",
          cyan: "#00B5AD",
          muted: "#9aa0a6",
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
          "Outfit",
          "DM Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: ["Sora", "Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 10px 40px -12px rgba(200, 255, 0, 0.45)",
        panel: "0 16px 48px -24px rgba(0, 0, 0, 0.65)",
      },
      backgroundImage: {
        "nx-hero":
          "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(200,255,0,0.12), transparent 55%)",
      },
    },
  },
  plugins: [],
};
