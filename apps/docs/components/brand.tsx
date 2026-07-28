import type { SVGProps } from "react";

// A friendly paw mark — used in the wordmark and as a decorative motif.
export function PawMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor" {...props}>
      <ellipse cx="16" cy="20.5" rx="7.5" ry="6" />
      <ellipse cx="7.5" cy="12" rx="3" ry="3.8" />
      <ellipse cx="24.5" cy="12" rx="3" ry="3.8" />
      <ellipse cx="12" cy="7" rx="2.6" ry="3.3" />
      <ellipse cx="20" cy="7" rx="2.6" ry="3.3" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink">
      <span className="grid size-7 place-items-center rounded-full bg-honey text-[#2b1e12] shadow-sm">
        <PawMark className="size-4" />
      </span>
      FluffBoost
    </span>
  );
}
