// src/pages/LivePage.jsx

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createAudioEngine } from "../utils/audioEngine";
import useLiveViewer from "../hooks/useLiveViewer";
import useFullscreen from "../hooks/useFullscreen";
import TimerStage from "../components/TimerStage";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  IconButton,
  PageShell,
} from "../components/ui/ui";

function useWakeLock() {
  useEffect(() => {
    let lock = null;

    const request = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;

      try {
        lock = await navigator.wakeLock.request("screen");
      } catch (error) {
        console.warn("WakeLock error:", error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (lock) lock.release().catch(() => {});
    };
  }, []);
}

function formatAge(age) {
  if (!Number.isFinite(age)) return "";
  const seconds = Math.max(0, Math.floor(age / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}min`;
}

export default function LivePage() {
  const { id } = useParams();
  const { display, error, loading, isLive, age } = useLiveViewer(id);
  const [audioEngine] = useState(createAudioEngine);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("pb:live:sound") === "1";
    } catch {
      return false;
    }
  });
  const [soundStatus, setSoundStatus] = useState("");
  const previousLevelRef = useRef(null);
  const { canUseFullscreen, isFullscreen, toggleFullscreen } = useFullscreen();

  useWakeLock();

  useEffect(() => {
    if (display?.name) {
      document.title = `${display.name} · Ao vivo`;
    }

    return () => {
      document.title = "Poker Blinds Timer";
    };
  }, [display?.name]);

  useEffect(() => {
    if (!display) return;

    if (previousLevelRef.current === null) {
      previousLevelRef.current = display.levelIndex;
      return;
    }

    if (display.levelIndex !== previousLevelRef.current) {
      previousLevelRef.current = display.levelIndex;
      if (soundEnabled) audioEngine.play();
    }
  }, [display, soundEnabled, audioEngine]);

  const handleEnableSound = async () => {
    await audioEngine.unlock();
    setSoundEnabled(true);

    try {
      localStorage.setItem("pb:live:sound", "1");
    } catch {
      // Ignore storage errors; sound still works for this session.
    }

    await audioEngine.play();
    setSoundStatus("Som ativado. Vai tocar quando o nível virar.");
    window.setTimeout(() => setSoundStatus(""), 3000);
  };

  if (loading && !display) {
    return (
      <PageShell>
        <div className="flex min-h-[75dvh] items-center justify-center">
          <p className="text-sm text-gray-400">Conectando ao link…</p>
        </div>
      </PageShell>
    );
  }

  if (!display) {
    return (
      <PageShell>
        <div className="flex min-h-[75dvh] items-center justify-center">
          <EmptyState
            icon="link_off"
            title="Link inválido ou expirado"
            description={error || "O host pode ter encerrado o link ao vivo."}
            action={
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  const level = display.levels[display.levelIndex];
  const nextLevel = display.levels[display.levelIndex + 1];
  const paused = !display.isRunning && !display.isFinished;

  const status = !isLive
    ? "Sem conexão"
    : display.isFinished
      ? "Encerrado"
      : paused
        ? "Pausado"
        : "Ao vivo";

  const statusTone = !isLive
    ? "red"
    : display.isFinished
      ? "gray"
      : paused
        ? "amber"
        : "green";

  return (
    <TimerStage
      name={display.name}
      status={<Badge tone={statusTone}>{status}</Badge>}
      actions={
        canUseFullscreen ? (
          <IconButton
            icon={isFullscreen ? "fullscreen_exit" : "fullscreen"}
            label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
            onClick={toggleFullscreen}
            aria-pressed={isFullscreen}
          />
        ) : null
      }
      level={level}
      levelIndex={display.levelIndex}
      levelCount={display.levels.length}
      remaining={display.remaining}
      nextLevel={nextLevel}
      isFinished={display.isFinished}
      notice={
        !isLive ? (
          <Alert tone="error" className="text-xs">
            Sem conexão há {formatAge(age)}. O relógio segue pelo último estado.
          </Alert>
        ) : null
      }
    >
      <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Button
          variant={soundEnabled ? "secondary" : "primary"}
          icon={soundEnabled ? "volume_up" : "volume_off"}
          onClick={handleEnableSound}
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? "Som ligado" : "Ativar som"}
        </Button>

        {soundStatus && (
          <p role="status" className="text-center text-xs text-green-300">
            {soundStatus}
          </p>
        )}

        <p className="text-center text-xs text-gray-400">
          Link de acompanhamento · só o timer
        </p>
      </div>
    </TimerStage>
  );
}
