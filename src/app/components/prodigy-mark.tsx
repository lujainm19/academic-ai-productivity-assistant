// prodigy-mark.tsx
// The app's brand mark: an open-top rounded square (never quite closed,
// a prodigy is talent still in progress, and it's literally what the
// Focus Canvas is, an empty frame waiting to be filled) with two eyes low
// in the frame. No mouth by default, this is the "calmer" variant
// picked over the fuller "delighted" expression, since it sits in the
// sidebar all day rather than showing up once.
//
// This is also the app's mascot: the same face shows up anywhere prodigy
// is "talking" to the student (chat avatars, the sidebar companion, AI
// call-outs) or reacting to them (a "happy" mood for streaks, level-ups,
// and cleared task lists). One face, a few small expressions, used
// everywhere instead of a generic icon.
//
// Uses currentColor for both stroke and fill, so it always matches
// whatever text color it's placed in, no color prop to keep in sync by
// hand across dark chrome, a future light surface, etc.

export interface ProdigyMarkProps {
  size?: number;
  className?: string;
  /** "neutral" (default, calm) or "happy" (small smile, for celebrations). */
  mood?: "neutral" | "happy";
  /** Slow, occasional blink, use sparingly for a "study buddy" that's alive. */
  blink?: boolean;
}

export function ProdigyMark({ size = 24, className = "", mood = "neutral", blink = false }: ProdigyMarkProps) {
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
      <ellipse cx="38" cy="58" rx="5.5" ry="5.5" fill="currentColor">
        {blink && (
          <animate attributeName="ry" values="5.5;5.5;0.6;5.5;5.5" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
        )}
      </ellipse>
      <ellipse cx="62" cy="58" rx="5.5" ry="5.5" fill="currentColor">
        {blink && (
          <animate attributeName="ry" values="5.5;5.5;0.6;5.5;5.5" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
        )}
      </ellipse>
      {mood === "happy" && (
        <path d="M40 74 Q50 82 60 74" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}
