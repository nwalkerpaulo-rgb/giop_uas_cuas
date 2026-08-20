/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0B1220",
        panel: "#131C2E",
        panel2: "#1B2740",
        border: "#26324A",
        amber: "#F5B942",
        cyan: "#5EEAD4",
        alert: "#E64C4C",
        ok: "#4ADE80",
        ink: "#C9D1D9",
        muted: "#7A8AA6",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}
