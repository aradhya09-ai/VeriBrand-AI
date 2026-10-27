/** @type {import('tailwindcss').Config} */

// Colors are declared as `rgb(var(--name) / <alpha-value>)` so Tailwind's
// opacity modifiers (bg-card/80, border-accent/50, ...) keep working while the
// underlying values switch between the dark and light (lavender) themes in
// src/index.css. Translucent helper tokens (line/panel/faint) hold a complete
// color inside the variable and are therefore never used with modifiers.
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: themed("bg"),
          soft: themed("bg-soft"),
        },
        card: {
          DEFAULT: themed("card"),
          elevated: themed("elevated"),
        },
        accent: {
          DEFAULT: themed("accent"),
          cyan: themed("accent-2"),
        },
        ink: {
          DEFAULT: themed("text"),
          muted: themed("muted"),
        },
        ok: themed("ok"),
        warn: themed("warn"),
        bad: themed("bad"),
        alert: themed("alert"),
        info: themed("info"),
        // Translucent helper tokens — complete colors, no opacity modifiers.
        line: "var(--line)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        faint: "var(--faint)",
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
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)",
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
