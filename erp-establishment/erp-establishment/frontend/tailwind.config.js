/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F2E2B",       // fond principal - petrol profond
        inkdark: "#0A211E",
        paper: "#FAFAF7",     // cartes "ticket"
        paperdim: "#EFEBE1",
        amber: "#E8A33D",     // accent - CTA, prix
        amberdark: "#C97F1E",
        line: "#D9D3C4",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
