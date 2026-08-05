/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nx: {
          bg: "#06080f",
          elevated: "#0a0e17",
          surface: "#0d121c",
          panel: "#121826",
          accent: "#2dd4bf",
          cyan: "#22d3ee",
          muted: "#8b9bb4",
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
        glow: "0 10px 40px -12px rgba(45, 212, 191, 0.45)",
        panel: "0 16px 48px -24px rgba(0, 0, 0, 0.65)",
      },
      backgroundImage: {
        "nx-hero":
          "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(45,212,191,0.16), transparent 55%)",
      },
    },
  },
  plugins: [],
};
