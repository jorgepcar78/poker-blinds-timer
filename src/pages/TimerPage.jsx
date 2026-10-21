import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import { formatTime } from "../utils/time";
import {
  dismissFullscreenHint,
  getFullscreenApi,
  isFullscreenHintDismissed,
  isIos,
  isStandalone,
} from "../utils/platform";
import Controls from "../components/Controls";

const BADGE_VARIANTS = {
  current: {
    container:
      "bg-green-600 px-5 py-2 text-2xl text-white shadow-lg shadow-green-950/50 sm:px-7 sm:text-3xl",
    label: "text-white/70",
    divider: "text-white/40",
    ante: "text-white/80",
  },
  next: {
    container: "bg-gray-800 px-4 py-1.5 text-base text-gray-200 sm:text-lg",
    label: "text-gray-500",
    divider: "text-gray-600",
    ante: "text-gray-400",
  },
};

function BlindsBadge({ level, variant = "current" }) {
  const styles = BADGE_VARIANTS[variant];

  return (
    <span
      className={`inline-flex flex-col items-center gap-y-0.5 rounded-full font-bold leading-tight ${styles.container}`}
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

function TimerPage() {
  const {
    levels,
    currentLevelIndex,
    remainingTime,
    isRunning,
    isFinished,
    start,
    pause,
    nextLevel,
    previousLevel,
  } = useTournamentContext();

  const [capabilities] = useState(() => {
    const fullscreen = getFullscreenApi();
    const ios = isIos();

    return {
      fullscreen,
      canUseFullscreen: fullscreen.supported && !ios,
      showInstallHint: ios && !isStandalone(),
    };
  });

  const { fullscreen } = capabilities;
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(fullscreen.getElement()));
  const [showInstallHint, setShowInstallHint] = useState(
    () => capabilities.showInstallHint && !isFullscreenHintDismissed()
  );

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(Boolean(fullscreen.getElement()));
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("webkitfullscreenchange", updateFullscreenState);
    };
  }, [fullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (fullscreen.getElement()) {
        await fullscreen.exit();
      } else {
        await fullscreen.request();
      }
    } catch (error) {
      console.warn("Fullscreen error:", error);
    }
  };

  const handleStartClick = () => {
    if (capabilities.canUseFullscreen && !fullscreen.getElement()) {
      try {
        Promise.resolve(fullscreen.request()).catch((error) =>
          console.warn("Fullscreen error:", error)
        );
      } catch (error) {
        console.warn("Fullscreen error:", error);
      }
    }

    start();
  };

  const dismissInstallHint = () => {
    setShowInstallHint(false);
    dismissFullscreenHint();
  };

  if (!levels.length) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-black px-6 text-white">
        <p className="text-xl">Nenhum nível configurado.</p>
        <Link
          to="/settings"
          className="rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-500"
        >
          Configurar níveis
        </Link>
      </div>
    );
  }

  const currentLevel = levels[currentLevelIndex];
  const nextLevelData = levels[currentLevelIndex + 1];

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden bg-black px-4 text-white"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <header className="relative w-full">
        <div className="absolute right-0 top-0 z-10 flex items-center gap-2">
          {capabilities.canUseFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-lg bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {isFullscreen ? "Sair" : "Tela cheia"}
            </button>
          )}
          <Link
            to="/settings"
            className="rounded-lg bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Configurações"
          >
            ⚙️
          </Link>
        </div>

        <div className="flex flex-col items-center gap-2 pt-12 text-center sm:pt-0">
          <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">
            <span className="text-gray-400">NÍVEL</span> {currentLevelIndex + 1}/{levels.length}
          </h1>
          <BlindsBadge level={currentLevel} />
        </div>

        {showInstallHint && (
          <div className="mx-auto mt-3 flex max-w-md items-start justify-center gap-2 rounded-lg bg-gray-800/80 px-3 py-2 text-center text-xs leading-relaxed text-gray-300">
            <span>
              Para tela cheia no iPhone, toque em{" "}
              <strong className="font-semibold text-white">Compartilhar</strong> →{" "}
              <strong className="font-semibold text-white">Adicionar à Tela de Início</strong>.
            </span>
            <button
              type="button"
              onClick={dismissInstallHint}
              className="shrink-0 px-1 text-base leading-none text-gray-400 hover:text-white"
              aria-label="Dispensar dica"
            >
              ×
            </button>
          </div>
        )}
      </header>

      {/* Clock */}
      <main className="flex flex-1 items-center justify-center">
        <div
          className={`font-mono text-[26vw] font-bold leading-none sm:text-[16vw] ${
            remainingTime <= 60 ? "text-red-500" : "text-white"
          }`}
        >
          {formatTime(remainingTime)}
        </div>
      </main>

      {/* Next level and controls */}
      <footer className="flex w-full flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Próximo
          </span>
          {nextLevelData ? (
            <BlindsBadge level={nextLevelData} variant="next" />
          ) : (
            <span className="text-sm text-gray-500">—</span>
          )}
        </div>

        {isFinished && (
          <div className="rounded bg-red-600 px-3 py-1 text-sm font-bold">
            FIM DO TORNEIO
          </div>
        )}

        <Controls
          isRunning={isRunning}
          start={handleStartClick}
          pause={pause}
          nextLevel={nextLevel}
          previousLevel={previousLevel}
          className="flex flex-wrap justify-center gap-2 sm:gap-4"
        />
      </footer>
    </div>
  );
}

export default TimerPage;
