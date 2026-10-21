// src/hooks/useTournament.js

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLevels, normalizeLevels, persistLevels } from "../store/tournamentStore";
import { createAudioEngine } from "../utils/audioEngine";

const TIMER_KEY = "tournament-timer";
const TICK_MS = 250;

function levelSeconds(level) {
  return Math.max(0, Number(level?.duration) || 0) * 60;
}

function readSavedTimer() {
  try {
    const saved = localStorage.getItem(TIMER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Could not load timer:", error);
    return null;
  }
}

function persistTimer(timer) {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  } catch (error) {
    console.warn("Could not save timer:", error);
  }
}

function createInitialTimer(levels) {
  if (!levels.length) {
    return { currentLevelIndex: 0, remaining: 0, isRunning: false, endTime: null };
  }

  const saved = readSavedTimer();
  if (!saved || typeof saved.currentLevelIndex !== "number") {
    return {
      currentLevelIndex: 0,
      remaining: levelSeconds(levels[0]),
      isRunning: false,
      endTime: null,
    };
  }

  const currentLevelIndex = Math.min(
    Math.max(0, Math.round(saved.currentLevelIndex)),
    levels.length - 1
  );

  if (!saved.isRunning) {
    return {
      currentLevelIndex,
      remaining: Math.min(
        Math.max(0, Math.round(Number(saved.remaining) || 0)),
        levelSeconds(levels[currentLevelIndex])
      ),
      isRunning: false,
      endTime: null,
    };
  }

  // Rebuild the running timer from its deadline and skip levels that
  // finished while the page was closed or the device was asleep.
  const now = Date.now();
  let endTime = Number(saved.endTime) || now;
  let index = currentLevelIndex;

  while (endTime <= now && index < levels.length - 1) {
    index += 1;
    endTime += levelSeconds(levels[index]) * 1000;
  }

  if (endTime <= now) {
    return { currentLevelIndex: index, remaining: 0, isRunning: false, endTime: null };
  }

  return {
    currentLevelIndex: index,
    remaining: Math.ceil((endTime - now) / 1000),
    isRunning: true,
    endTime,
  };
}

export default function useTournament() {
  const [levels, setLevels] = useState(loadLevels);
  const [timer, setTimer] = useState(() => createInitialTimer(levels));

  const [audioEngine] = useState(createAudioEngine);
  const levelsRef = useRef(levels);
  const wakeLockRef = useRef(null);
  const advanceRef = useRef(null);
  const handledEndTimeRef = useRef(null);
  const persistedKeyRef = useRef("");

  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  // iOS only allows audio after a user gesture. Unlock on the first
  // interaction so a timer restored after a reload can still play the sound.
  useEffect(() => {
    const events = ["pointerdown", "touchend", "keydown"];

    const handleFirstInteraction = () => {
      audioEngine.unlock();
      events.forEach((event) => document.removeEventListener(event, handleFirstInteraction));
    };

    events.forEach((event) =>
      document.addEventListener(event, handleFirstInteraction, { passive: true })
    );

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleFirstInteraction));
    };
  }, [audioEngine]);

  const playLevelUpSound = useCallback(() => {
    audioEngine.play();
  }, [audioEngine]);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator) || wakeLockRef.current) return;

    try {
      const lock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = lock;
      lock.addEventListener("release", () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null;
      });
    } catch (error) {
      console.warn("WakeLock error:", error);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!lock) return;

    try {
      await lock.release();
    } catch (error) {
      console.warn("WakeLock release error:", error);
    }
  }, []);

  // Advance to the next level. When called by the tick, `expiredAt` holds the
  // deadline that just passed so skipped levels are accounted for.
  const advance = useCallback(
    (expiredAt = null) => {
      playLevelUpSound();

      setTimer((prev) => {
        const currentLevels = levelsRef.current;
        let index = prev.currentLevelIndex;

        if (expiredAt === null) {
          index += 1;
          if (index >= currentLevels.length) {
            return { ...prev, remaining: 0, isRunning: false, endTime: null };
          }

          const duration = levelSeconds(currentLevels[index]);
          return {
            currentLevelIndex: index,
            remaining: duration,
            isRunning: prev.isRunning,
            endTime: prev.isRunning ? Date.now() + duration * 1000 : null,
          };
        }

        let endTime = expiredAt;
        do {
          index += 1;
          if (index >= currentLevels.length) {
            return { ...prev, remaining: 0, isRunning: false, endTime: null };
          }
          endTime += levelSeconds(currentLevels[index]) * 1000;
        } while (endTime <= Date.now());

        return {
          currentLevelIndex: index,
          remaining: Math.ceil((endTime - Date.now()) / 1000),
          isRunning: true,
          endTime,
        };
      });
    },
    [playLevelUpSound]
  );

  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  // Drive the countdown from a deadline instead of decrementing a counter,
  // so delayed/throttled ticks do not make the clock drift.
  useEffect(() => {
    if (!timer.isRunning || !timer.endTime) return undefined;

    const endTime = timer.endTime;
    handledEndTimeRef.current = null;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

      if (remaining <= 0) {
        if (handledEndTimeRef.current === endTime) return;
        handledEndTimeRef.current = endTime;
        advanceRef.current?.(endTime);
        return;
      }

      setTimer((prev) => (prev.remaining === remaining ? prev : { ...prev, remaining }));
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.endTime]);

  // Keep the screen awake only while the clock is running and re-acquire the
  // lock after the tab becomes visible again.
  useEffect(() => {
    if (!timer.isRunning) return undefined;

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [timer.isRunning, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        audioEngine.resume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [audioEngine]);

  // Persist only meaningful changes: endTime is enough to rebuild a running
  // timer, so ticking does not rewrite localStorage every second.
  useEffect(() => {
    const key = [
      timer.currentLevelIndex,
      timer.isRunning,
      timer.isRunning ? timer.endTime : timer.remaining,
    ].join(":");

    if (key === persistedKeyRef.current) return;

    persistedKeyRef.current = key;
    persistTimer(timer);
  }, [timer]);

  const start = useCallback(() => {
    audioEngine.unlock();

    setTimer((prev) => {
      if (prev.isRunning) return prev;

      const duration =
        prev.remaining > 0
          ? prev.remaining
          : levelSeconds(levelsRef.current[prev.currentLevelIndex]);

      if (duration <= 0) return prev;

      return {
        ...prev,
        remaining: duration,
        isRunning: true,
        endTime: Date.now() + duration * 1000,
      };
    });
  }, [audioEngine]);

  const pause = useCallback(() => {
    setTimer((prev) => {
      if (!prev.isRunning) return prev;

      const remaining = prev.endTime
        ? Math.max(0, Math.ceil((prev.endTime - Date.now()) / 1000))
        : prev.remaining;

      return { ...prev, remaining, isRunning: false, endTime: null };
    });
  }, []);

  const nextLevel = useCallback(() => {
    advance();
  }, [advance]);

  const previousLevel = useCallback(() => {
    setTimer((prev) => {
      const previousIndex = prev.currentLevelIndex - 1;
      if (previousIndex < 0) return prev;

      const duration = levelSeconds(levelsRef.current[previousIndex]);
      return {
        currentLevelIndex: previousIndex,
        remaining: duration,
        isRunning: prev.isRunning,
        endTime: prev.isRunning ? Date.now() + duration * 1000 : null,
      };
    });
  }, []);

  const updateLevels = useCallback((nextLevels) => {
    const normalized = normalizeLevels(nextLevels);

    levelsRef.current = normalized;
    setLevels(normalized);
    persistLevels(normalized);

    setTimer((prev) => {
      const currentIndex = Math.min(prev.currentLevelIndex, normalized.length - 1);
      const currentDuration = levelSeconds(normalized[currentIndex]);

      if (prev.isRunning) {
        return currentIndex === prev.currentLevelIndex
          ? prev
          : { ...prev, currentLevelIndex: currentIndex };
      }

      if (currentIndex !== prev.currentLevelIndex) {
        return {
          currentLevelIndex: currentIndex,
          remaining: currentDuration,
          isRunning: false,
          endTime: null,
        };
      }

      return { ...prev, remaining: Math.min(prev.remaining, currentDuration) };
    });
  }, []);

  const testSound = useCallback(async () => {
    await audioEngine.unlock();
    return audioEngine.play();
  }, [audioEngine]);

  const getAudioState = useCallback(() => audioEngine.getState(), [audioEngine]);

  const isFinished =
    levels.length > 0 &&
    !timer.isRunning &&
    timer.remaining === 0 &&
    timer.currentLevelIndex === levels.length - 1;

  return {
    levels,
    updateLevels,
    currentLevelIndex: timer.currentLevelIndex,
    remainingTime: timer.remaining,
    isRunning: timer.isRunning,
    isFinished,
    start,
    pause,
    nextLevel,
    previousLevel,
    testSound,
    getAudioState,
  };
}
