import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import { useSessionContext } from "../context/SessionContext";
import {
  dismissFullscreenHint,
  isFullscreenHintDismissed,
  isIos,
  isStandalone,
} from "../utils/platform";
import useFullscreen from "../hooks/useFullscreen";
import Controls from "../components/Controls";
import TimerStage from "../components/TimerStage";
import Icon from "../components/ui/Icon";
import { Badge, Button, EmptyState, IconButton, PageShell } from "../components/ui/ui";

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

  const { session, liveStatus } = useSessionContext();
  const liveError = Boolean(session.live?.active && liveStatus === "error");

  const { fullscreen, canUseFullscreen, isFullscreen, toggleFullscreen } = useFullscreen();
  const [showInstallHint, setShowInstallHint] = useState(
    () => isIos() && !isStandalone() && !isFullscreenHintDismissed()
  );

  const handleStartClick = () => {
    if (canUseFullscreen && !fullscreen.getElement()) {
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
      <PageShell>
        <div className="flex min-h-[75dvh] items-center justify-center">
          <EmptyState
            icon="tune"
            title="Nenhum nível configurado"
            description="Defina a estrutura de blinds para começar o torneio."
            action={
              <Button as={Link} to="/settings" icon="settings">
                Configurar níveis
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  const currentLevel = levels[currentLevelIndex];
  const nextLevelData = levels[currentLevelIndex + 1];

  const actions = (
    <>
      {canUseFullscreen && (
        <IconButton
          icon={isFullscreen ? "fullscreen_exit" : "fullscreen"}
          label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
          onClick={toggleFullscreen}
          aria-pressed={isFullscreen}
        />
      )}
      <IconButton
        as={Link}
        to="/menu"
        icon="settings"
        label={
          liveError
            ? "Menu e configurações — link ao vivo sem conexão"
            : "Menu e configurações"
        }
        indicator={liveError}
      />
    </>
  );

  const installNotice = showInstallHint ? (
    <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-gray-300">
      <Icon name="ios_share" size={16} className="mt-0.5 text-gray-400" />
      <span className="min-w-0 flex-1">
        Para tela cheia no iPhone, toque em{" "}
        <strong className="font-semibold text-white">Compartilhar</strong> →{" "}
        <strong className="font-semibold text-white">Adicionar à Tela de Início</strong>.
      </span>
      <IconButton
        icon="close"
        label="Dispensar dica"
        variant="ghost"
        size={16}
        onClick={dismissInstallHint}
        className="-mr-2 -mt-2 shrink-0"
      />
    </div>
  ) : null;

  return (
    <TimerStage
      status={liveError ? <Badge tone="amber">Link sem conexão</Badge> : null}
      actions={actions}
      level={currentLevel}
      levelIndex={currentLevelIndex}
      levelCount={levels.length}
      remaining={remainingTime}
      nextLevel={nextLevelData}
      isFinished={isFinished}
      notice={installNotice}
    >
      <Controls
        isRunning={isRunning}
        isFinished={isFinished}
        start={handleStartClick}
        pause={pause}
        nextLevel={nextLevel}
        previousLevel={previousLevel}
        className="max-w-sm"
      />
    </TimerStage>
  );
}

export default TimerPage;
