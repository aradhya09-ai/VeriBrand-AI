/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0B1020",
          soft: "#111827",
        },
        card: {
          DEFAULT: "#151D30",
          elevated: "#1C2740",
        },
        accent: {
          DEFAULT: "#6366F1",
          cyan: "#22D3EE",
        },
        ink: {
          DEFAULT: "#F8FAFC",
          muted: "#94A3B8",
        },
        ok: "#22C55E",
        warn: "#F59E0B",
        bad: "#EF4444",
        info: "#60A5FA",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(2,6,23,.4), 0 12px 32px -16px rgba(2,6,23,.8)",
        glow: "0 0 0 1px rgba(99,102,241,.25), 0 18px 50px -24px rgba(99,102,241,.55)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        drawLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        fadeUp: "fadeUp .5s cubic-bezier(.22,.8,.36,1) both",
        fadeIn: "fadeIn .4s ease both",
        shimmer: "shimmer 1.6s linear infinite",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
        slideIn: "slideIn .35s cubic-bezier(.22,.8,.36,1) both",
      },
    },
  },
  plugins: [],
};
