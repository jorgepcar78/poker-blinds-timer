// src/components/BlindsBadge.jsx

import React from "react";

const BADGE_VARIANTS = {
  current: {
    container:
      "bg-green-500 px-5 py-2 text-2xl text-gray-950 shadow-lg shadow-green-950/50 sm:px-7 sm:text-3xl",
    label: "text-green-950/60",
    divider: "text-green-950/40",
    ante: "text-green-950/80",
  },
  next: {
    container:
      "border border-white/10 bg-white/5 px-4 py-1.5 text-base text-gray-200 sm:text-lg",
    label: "text-gray-400",
    divider: "text-gray-500",
    ante: "text-gray-400",
  },
};

export default function BlindsBadge({ level, variant = "current" }) {
  if (!level) return null;

  const styles = BADGE_VARIANTS[variant];

  return (
    <span
      className={`inline-flex flex-col items-center gap-y-0.5 rounded-full font-semibold leading-tight tabular-nums ${styles.container}`}
    >
      <span className="inline-flex items-center gap-x-2 whitespace-nowrap">
        <span>
          <span className={styles.label}>SB</span> — {level.smallBlind}
        </span>
        <span aria-hidden="true" className={styles.divider}>
          ·
        </span>
        <span>
          <span className={styles.label}>BB</span> — {level.bigBlind}
        </span>
      </span>
      {level.ante > 0 && (
        <span className={`text-sm font-semibold sm:text-base ${styles.ante}`}>
          <span className={styles.label}>ANTE</span> — {level.ante}
        </span>
      )}
    </span>
  );
}
