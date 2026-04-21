// src/components/NextLevelDisplay.jsx

import React from "react";
import tournamentState from "../store/tournamentStore";

function NextLevelDisplay() {
  const nextIndex = tournamentState.currentLevelIndex + 1;
  const level = tournamentState.levels[nextIndex];
  if (!level) return null;
  return (
    <div className="text-center space-y-1">
      <div className="font-bold">PRÓXIMO</div>
      <div>SB {level.smallBlind}</div>
      <div>BB {level.bigBlind}</div>
      <div>ANTE {level.ante}</div>
    </div>
  );
}

export default NextLevelDisplay;
