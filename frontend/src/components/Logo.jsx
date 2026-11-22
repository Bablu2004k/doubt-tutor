// Doubt Tutor mark: a chat bubble with a question mark, wearing a tiny
// graduation cap. Colours come from the theme tokens so it looks right in
// both light and dark mode.
export default function Logo({ size = 28, className = "" }) {
  return (
    <svg
      viewBox="-48 -56 108 112"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Doubt Tutor logo"
    >
      <rect x="-40" y="-36" width="80" height="72" rx="24" fill="rgb(var(--accent))" />
      <path d="M-22 32 L-30 52 L-4 34 Z" fill="rgb(var(--accent))" />
      <path
        d="M-12 -10 C-12 -24 12 -24 12 -10 C12 -1 0 -1 0 9"
        fill="none"
        stroke="rgb(var(--paper))"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="0" cy="22" r="4.5" fill="rgb(var(--paper))" />
      <g transform="translate(34 -40) rotate(18)" stroke="rgb(var(--paper))" strokeWidth="2.5" strokeLinejoin="round">
        <polygon points="0,-12 22,-4 0,4 -22,-4" fill="rgb(var(--ink))" />
        <path d="M-12 0 V9 C-12 15 12 15 12 9 V0 L0 6 Z" fill="rgb(var(--ink) / 0.75)" />
      </g>
    </svg>
  );
}
