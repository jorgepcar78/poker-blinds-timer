// src/pages/TimerPage.jsx

import React from "react";
import TimerDisplay from "../components/TimerDisplay";
import BlindsDisplay from "../components/BlindsDisplay";
import NextLevelDisplay from "../components/NextLevelDisplay";
import Controls from "../components/Controls";

import useTimer from "../hooks/useTimer";
import tournamentStore from "../store/tournamentStore";
import { formatTime } from "../utils/time";

function TimerPage() {
  const {
    currentLevelIndex,
    remainingTime,
    isRunning,
    start,
    pause,
    nextLevel,
    previousLevel,
  } = useTimer(tournamentStore.levels);

  const levels = tournamentStore.levels;
  const currentLevel = levels[currentLevelIndex];

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center space-y-6 p-4">
      {/* Header */}
      <h1 className="text-2xl font-bold">NÍVEL {currentLevelIndex + 1}</h1>

      {/* Timer */}
      <TimerDisplay time={remainingTime} />

      {/* Blinds atuais */}
      <BlindsDisplay level={currentLevel} />

      {/* Próximo nível */}
      <NextLevelDisplay />

      {/* Controles */}
      <Controls
        isRunning={isRunning}
        start={start}
        pause={pause}
        nextLevel={nextLevel}
        previousLevel={previousLevel}
      />
    </div>
  );
}

export default TimerPage;
