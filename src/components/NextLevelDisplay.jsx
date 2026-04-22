// src/components/NextLevelDisplay.jsx

import React from "react";

function NextLevelDisplay({ currentLevelIndex, levels }) {
  const nextIndex = currentLevelIndex + 1;
  const level = levels[nextIndex];
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
