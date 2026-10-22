// src/hooks/useLiveViewer.js

import { useEffect, useRef, useState } from "react";
import { fetchLiveSession } from "../live/liveApi";

const POLL_MS = 4000;
const STALE_MS = 30000;

function levelDurationSeconds(level) {
  return Math.max(0, Number(level?.duration) || 0) * 60;
}

function displayFromPayload(payload) {
  const levels = Array.isArray(payload?.levels) ? payload.levels : [];
  const lastIndex = Math.max(0, levels.length - 1);
  const levelIndex = Math.min(
    Math.max(0, Math.round(Number(payload?.currentLevelIndex) || 0)),
    lastIndex
  );
  const remaining = Math.max(0, Math.round(Number(payload?.remainingTime) || 0));

  return {
    name: payload?.name || "Torneio",
    levels,
    levelIndex,
    remaining,
    isRunning: Boolean(payload?.isRunning),
    isFinished: Boolean(payload?.isFinished),
  };
}

export default function useLiveViewer(sessionId) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(sessionId ? "" : "Link inválido.");
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [display, setDisplay] = useState(null);
  const [now, setNow] = useState(0);
  const endTimeRef = useRef(null);
  const lastUpdatedAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    if (!sessionId) {
      return undefined;
    }

    const load = async () => {
      try {
        const result = await fetchLiveSession(sessionId);
        if (cancelled) return;

        if (result.updatedAt > lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = result.updatedAt;
          const nextDisplay = displayFromPayload(result.payload);
          endTimeRef.current = Date.now() + nextDisplay.remaining * 1000;
          setDisplay(nextDisplay);
        }

        setMeta({
          updatedAt: result.updatedAt,
          serverNow: result.serverNow,
          fetchedAt: Date.now(),
        });
        setNow(Date.now());
        setError("");
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay((prev) => {
        if (!prev || !prev.isRunning || prev.isFinished) return prev;

        const endTime = endTimeRef.current;
        if (!endTime) return prev;

        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (remaining > 0) {
          return prev.remaining === remaining ? prev : { ...prev, remaining };
        }

        const nextIndex = prev.levelIndex + 1;
        if (nextIndex >= prev.levels.length) {
          return { ...prev, remaining: 0, isRunning: false, isFinished: true };
        }

        const duration = levelDurationSeconds(prev.levels[nextIndex]);
        endTimeRef.current = Date.now() + duration * 1000;

        return { ...prev, levelIndex: nextIndex, remaining: duration };
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const age = meta
    ? Math.max(0, meta.serverNow - meta.updatedAt) + Math.max(0, now - meta.fetchedAt)
    : Number.POSITIVE_INFINITY;

  return {
    display,
    error,
    loading,
    isLive: age <= STALE_MS,
    age,
  };
}
