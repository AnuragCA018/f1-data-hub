/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // F1 Design System 2.0
        f1red:    "#FF1801",
        f1blue:   "#1F8BFF",
        bg:       "#0B0D12",
        card:     "#141821",
        cardHover:"#1C2130",
        border:   "#1E2535",
        borderHover: "#2E3D55",
        // Text
        textPrimary:   "#FFFFFF",
        textSecondary: "#9CA3AF",
        textMuted:     "#6B7280",
        // Legacy aliases
        f1dark:   "#0B0D12",
        surface:  "#141821",
        muted:    "#9CA3AF",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":     "fadeIn 0.3s ease-out",
        "slide-up":    "slideUp 0.3s ease-out",
        "glow-pulse":  "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        glowPulse: { "0%,100%": { boxShadow: "0 0 8px 0 #FF180133" }, "50%": { boxShadow: "0 0 20px 4px #FF180155" } },
      },
      backgroundImage: {
        "f1-gradient":  "linear-gradient(135deg, #FF1801 0%, #FF6B35 100%)",
        "card-glow":    "linear-gradient(135deg, #141821 0%, #1C2130 100%)",
        "blue-glow":    "linear-gradient(135deg, #1F8BFF22 0%, transparent 60%)",
        "red-glow":     "linear-gradient(135deg, #FF180122 0%, transparent 60%)",
      },
      boxShadow: {
        "card":     "0 1px 3px 0 rgba(0,0,0,0.6), 0 0 0 1px #1E2535",
        "card-hover": "0 4px 24px 0 rgba(0,0,0,0.5), 0 0 0 1px #2E3D55",
        "f1red":    "0 0 20px 0 #FF180144",
        "f1blue":   "0 0 20px 0 #1F8BFF44",
        "glow-sm":  "0 0 10px 0 #FF180133",
      },
    },
  },
  plugins: [],
};
