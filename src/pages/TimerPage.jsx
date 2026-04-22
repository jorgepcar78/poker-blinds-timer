import React from "react";
import BlindsDisplay from "../components/BlindsDisplay";
import NextLevelDisplay from "../components/NextLevelDisplay";
import useTimer from "../hooks/useTimer";
import tournamentStore from "../store/tournamentStore";
import { formatTime } from "../utils/time";
import Controls from "../components/Controls";

function TimerPage() {
  // Get timer functions and state from hook
  const {
    currentLevelIndex,
    remainingTime,
    isRunning,
    start: startTimer,
    pause: pauseTimer,
    nextLevel: nextLevelFn,
    previousLevel: prevLevelFn,
  } = useTimer(tournamentStore.levels);

  // Enter fullscreen
  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  // Handle start button click (triggers fullscreen then starts timer)
  const handleStartClick = () => {
    enterFullscreen();
    startTimer();
  };

  // Get levels data
  const levels = tournamentStore.levels;
  const totalLevels = levels.length;
  const currentLevel = levels[currentLevelIndex];
  const nextLevelIndex = (currentLevelIndex + 1) % totalLevels;
  const nextLevelData = levels[nextLevelIndex];

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col justify-between items-center p-6">
      {/* Level Header */}
      <div className="text-3xl font-bold">
        NÍVEL {currentLevelIndex + 1}/{totalLevels}
      </div>

      {/* Current Blinds */}
      <BlindsDisplay level={currentLevel} />

      {/* Big Clock */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[12rem] md:text-[16rem] font-mono font-bold">
          {formatTime(remainingTime)}
        </div>
      </div>

      {/* Next Level */}
      <NextLevelDisplay currentLevelIndex={currentLevelIndex} levels={levels} />

      {/* Button Bar */}
      <Controls
        isRunning={isRunning}
        start={handleStartClick}
        pause={pauseTimer}
        nextLevel={nextLevelFn}
        previousLevel={prevLevelFn}
      />
    </div>
  );
}

export default TimerPage;