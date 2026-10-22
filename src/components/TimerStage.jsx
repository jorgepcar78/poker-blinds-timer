// src/components/TimerStage.jsx

import React from "react";
import { formatTime } from "../utils/time";
import BlindsBadge from "./BlindsBadge";
import { Badge } from "./ui/ui";

export default function TimerStage({
  name,
  status,
  actions,
  level,
  levelIndex,
  levelCount,
  remaining,
  nextLevel,
  isFinished,
  notice,
  children,
}) {
  const lastMinute = !isFinished && remaining > 0 && remaining <= 60;
  const clockText = formatTime(remaining);
  const clockSize = `min(calc((100vw - 2rem) / ${(clockText.length * 0.61).toFixed(2)}), 28dvh, 12rem)`;
  const hasHeaderContent = Boolean(name || status);

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-black px-4 text-white"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      {actions && (
        <div
          className="absolute right-4 z-10 flex items-center gap-2"
          style={{ top: "max(1rem, env(safe-area-inset-top))" }}
        >
          {actions}
        </div>
      )}

      <header className="w-full shrink-0">
        {hasHeaderContent && (
          <div className="flex min-h-11 items-center gap-2 pr-28">
            {name && <span className="truncate text-sm text-gray-400">{name}</span>}
            {status}
          </div>
        )}

        {notice && (
          <div
            className={`mx-auto mt-2 max-w-md ${
              !hasHeaderContent && actions ? "pr-14" : ""
            }`}
          >
            {notice}
          </div>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden py-2">
        <p className="sr-only" aria-live="polite">
          Nível {levelIndex + 1} de {levelCount}
        </p>

        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          <span className="text-gray-400">Nível </span>
          <span className="tabular-nums">
            {levelIndex + 1}/{levelCount}
          </span>
        </h1>

        <BlindsBadge level={level} />

        <div
          role="timer"
          aria-live="off"
          style={{ fontSize: clockSize }}
          className={`font-mono font-semibold leading-none tracking-tight tabular-nums ${
            lastMinute ? "text-red-500" : "text-white"
          }`}
        >
          {clockText}
        </div>

        {lastMinute && <Badge tone="red">Último minuto</Badge>}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-gray-400">Próximo</span>
          {nextLevel ? (
            <BlindsBadge level={nextLevel} variant="next" />
          ) : (
            <span className="text-sm text-gray-400">Nenhum</span>
          )}
        </div>
      </main>

      <footer className="flex w-full shrink-0 flex-col items-center gap-2 sm:gap-3">
        {isFinished && <Badge tone="red">Fim do torneio</Badge>}
        {children}
      </footer>
    </div>
  );
}
