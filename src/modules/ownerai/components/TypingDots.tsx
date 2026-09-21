"use client";

/**
 * TypingDots — three-dot typing indicator for the assistant loading state.
 *
 * Reduced-motion safe: the keyframes collapse to a single static frame under
 * `prefers-reduced-motion: reduce` (handled globally in globals.css), so the
 * dots remain visible without animation.
 */

export function TypingDots() {
  return (
    <span
      className="inline-flex items-center gap-1"
      role="status"
      aria-label="typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-lime/80 animate-bounce"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: "1s",
          }}
        />
      ))}
    </span>
  );
}
