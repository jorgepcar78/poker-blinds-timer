import React from "react";
import useTimer from "../hooks/useTimer";
import tournamentStore from "../store/tournamentStore";
import { formatTime } from "../utils/time";
import Controls from "../components/Controls";
import { useNavigate } from "react-router-dom";

function TimerPage() {
  const navigate = useNavigate();
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
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col items-center justify-between px-4 py-4">
      <div className="flex flex-col h-full w-full items-center justify-between space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold">
            NÍVEL {currentLevelIndex + 1}/{levels.length}
          </div>
          <div className="text-xl">
            SB — {currentLevel.smallBlind}
            &nbsp;&nbsp; BB — {currentLevel.bigBlind}
            {currentLevel.ante > 0 && (
              <>
                &nbsp;&nbsp; ANTE — {currentLevel.ante}
              </>
            )}
          </div>
        </div>


        {/* Clock */}
        <div className="flex-1 flex items-center justify-center">
          <div className="font-mono font-bold text-[16vw] leading-none">
            {formatTime(remainingTime)}
          </div>
        </div>

        {/* Next Level (gray) */}
        <div className="flex items-center justify-center space-x-2 text-center text-gray-400 space-y-1 mb-4">
          <div className="text-lg font-semibold">PRÓXIMO</div>
          {levels[currentLevelIndex + 1] && (
            <div className="text-lg">
              SB — {levels[currentLevelIndex + 1].smallBlind}
              &nbsp;&nbsp; BB — {levels[currentLevelIndex + 1].bigBlind}
              {levels[currentLevelIndex + 1].ante > 0 && (
                <>
                  &nbsp;&nbsp; ANTE — {levels[currentLevelIndex + 1].ante}
                </>
              )}
            </div>
          )}
          {/* Settings button */}
          <button
            onClick={() => navigate("/settings") }
            className="ml-2 p-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
            aria-label="Configurações"
          >⚙️</button>
        </div>

        {/* Buttons (bottom) */}
        <div className="flex gap-4 justify-center">
          <Controls
            isRunning={isRunning}
            start={handleStartClick}
            pause={pauseTimer}
            nextLevel={nextLevelFn}
            previousLevel={prevLevelFn}
            className="flex justify-center gap-4"
          />
        </div>
      </div>
    </div>
  );
}

export default TimerPage;