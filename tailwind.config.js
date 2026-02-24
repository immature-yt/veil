/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        veil: {
          black: "#0A0A0F",
          surface: "#111118",
          card: "#18181F",
          border: "#2A2A35",
          muted: "#3A3A48",
          accent: "#C8A96E",    // warm gold
          accentDim: "#8A6F40",
          text: "#E8E4DC",
          textMuted: "#8A8890",
          danger: "#C84B4B",
          success: "#4B9C6E",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 8px rgba(200,169,110,0.2)" },
          "100%": { boxShadow: "0 0 24px rgba(200,169,110,0.5)" },
        },
      },
    },
  },
  plugins: [],
};
