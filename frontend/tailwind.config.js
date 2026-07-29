/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Same warm palette as before, pulled a notch darker so surfaces
        // read as warm off-white/greige glass instead of almost-pure-white
        // — a moderate dim, not a full dark-mode inversion (text stays
        // dark-on-light throughout).
        ink: "#4a332b",        // deep espresso - primary text on glass
        forest: "#8c6259",     // blend of terracotta/espresso - user bubble
        accent: "#a5695c",     // terracotta, deepened slightly to read against darker glass
        signal: "#6f8865",     // muted sage (new, functional) - correct-answer accent
        flag: "#a13f32",       // muted brick (new, functional) - wrong-answer accent
        paper: "#efe6e2",      // warm greige - glass base, light text on dark accents
        cloud: "#c9b8bd",      // deepened dusty lavender - app background wash
        slate: "#75564d",      // muted mocha - secondary/muted text
        mauve: "#b88f8c",      // dusty rose, deepened - decorative accents, badges, blobs
        lilac: "#b39cb2",      // deepened soft lilac - decorative accents, badges, blobs
        glass: "#efe6e2",      // base tone for frosted glass cards (used via .glass)
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
