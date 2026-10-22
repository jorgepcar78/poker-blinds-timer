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

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden bg-black px-4 text-white"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <header className="w-full shrink-0">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {name && <span className="truncate text-sm text-gray-400">{name}</span>}
            {status}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        <div className="mt-2 flex flex-col items-center gap-2 text-center">
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
        </div>

        {notice && <div className="mx-auto mt-3 max-w-md">{notice}</div>}
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden py-2">
        <div
          role="timer"
          aria-live="off"
          className={`font-mono text-[min(26vw,27dvh,12rem)] font-semibold leading-none tracking-tight tabular-nums ${
            lastMinute ? "text-red-500" : "text-white"
          }`}
        >
          {formatTime(remaining)}
        </div>
        {lastMinute && (
          <Badge tone="red" className="mt-3">
            Último minuto
          </Badge>
        )}
      </main>

      <footer className="flex w-full shrink-0 flex-col items-center gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-gray-400">Próximo</span>
          {nextLevel ? (
            <BlindsBadge level={nextLevel} variant="next" />
          ) : (
            <span className="text-sm text-gray-400">Nenhum</span>
          )}
        </div>

        {isFinished && <Badge tone="red">Fim do torneio</Badge>}

        {children}
      </footer>
    </div>
  );
}
