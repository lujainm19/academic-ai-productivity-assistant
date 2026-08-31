// prodigy-mark.tsx
// The app's brand mark: an open-top rounded square (never quite closed —
// a prodigy is talent still in progress, and it's literally what the
// Focus Canvas is, an empty frame waiting to be filled) with two eyes low
// in the frame. No mouth, deliberately — this is the "calmer" variant
// picked over the fuller "delighted" expression, since it sits in the
// sidebar all day rather than showing up once.
//
// Uses currentColor for both stroke and fill, so it always matches
// whatever text color it's placed in — no color prop to keep in sync by
// hand across dark chrome, a future light surface, etc.

export function ProdigyMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="Prodigy"
    >
      <rect
        x="10" y="10" width="80" height="80" rx="16"
        stroke="currentColor" strokeWidth="9"
        strokeDasharray="248 40" strokeDashoffset="-58"
        strokeLinecap="round"
      />
      <circle cx="38" cy="58" r="5.5" fill="currentColor" />
      <circle cx="62" cy="58" r="5.5" fill="currentColor" />
    </svg>
  );
}
