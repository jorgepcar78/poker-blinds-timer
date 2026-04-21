// src/hooks/useTimer.js

import { useState, useEffect, useRef } from "react";

function playLevelUpSound() {
  if (!(window.AudioContext || window.webkitAudioContext)) {
    console.warn('Web Audio API not supported in this browser');
    return;
  }
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn('Failed to play level up sound:', e);
  }
}

export default function useTimer(levels) {
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
    setCurrentLevelIndex(prev => {
      const nextIdx = prev + 1;
      if (nextIdx >= levels.length) {
        // Play level up sound
        playLevelUpSound();
        pause();
        setRemainingTime(0);
        return prev;
      }
      setRemainingTime(
        levels[nextIdx].duration
      );
      // Play level up sound
      playLevelUpSound();
      return nextIdx;
    });
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
