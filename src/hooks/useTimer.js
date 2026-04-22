import { useState, useEffect, useRef } from "react";

export default function useTimer(levels) {
  // Audio for level‑up sound – defined inside the hook so useRef is called within component context
  const audioRef = useRef(new Audio("/level-up.mp3"));

  function playLevelUpSound() {
    try {
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.warn("Audio failed:", err);
      });
    } catch (err) {
      console.warn("Audio error:", err);
    }
  }

  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [remainingTime, setRemainingTime] = useState(
    levels && levels[0] ? levels[0].duration : 0
  );
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.log("WakeLock error:", err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      releaseWakeLock();
    };
  }, []);


  const start = () => {
    if (intervalRef.current) return;
    setIsRunning(true);
    requestWakeLock();
    intervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev > 0) {
          return prev - 1;
        }
        return 0;
      });
    }, 1000);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    releaseWakeLock();
  };

  const nextLevel = () => {
    const nextIdx = currentLevelIndex + 1;
    if (nextIdx >= levels.length) {
      playLevelUpSound();
      pause();
      setRemainingTime(0);
      return;
    }
    playLevelUpSound();
    setCurrentLevelIndex(nextIdx);
    setRemainingTime(levels[nextIdx].duration);
  };

  const previousLevel = () => {
    pause();
    setCurrentLevelIndex((prev) => {
      const prevIdx = prev - 1;
      if (prevIdx < 0) return prev;
      setRemainingTime(levels[prevIdx].duration);
      return prevIdx;
    });
  };

  // When level changes (e.g., via external next/prev), ensure timer resets
  useEffect(() => {
    setRemainingTime(
      levels[currentLevelIndex].duration
    );
  }, [currentLevelIndex]);

  // Watch remainingTime to advance level when it hits 0
  useEffect(() => {
    if (isRunning && remainingTime === 0) {
      nextLevel();
    }
  }, [remainingTime, isRunning]);

  return {
    currentLevelIndex,
    remainingTime,
    isRunning,
    start,
    pause,
    nextLevel,
    previousLevel,
  };
}