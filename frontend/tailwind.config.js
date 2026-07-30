/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Every color is backed by a CSS variable (set in index.css for
        // :root and [data-theme="dark"]), using the "R G B" triplet format
        // so Tailwind's opacity modifiers (e.g. bg-accent/10) keep working.
        // This means the whole app reskins by flipping one attribute on
        // <html> — no component classNames need to change between themes.
        ink: "rgb(var(--ink) / <alpha-value>)",
        forest: "rgb(var(--forest) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        signal: "rgb(var(--signal) / <alpha-value>)",
        flag: "rgb(var(--flag) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        cloud: "rgb(var(--cloud) / <alpha-value>)",
        slate: "rgb(var(--slate) / <alpha-value>)",
        mauve: "rgb(var(--mauve) / <alpha-value>)",
        lilac: "rgb(var(--lilac) / <alpha-value>)",
        glass: "rgb(var(--paper) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
