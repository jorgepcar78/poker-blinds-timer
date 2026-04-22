// src/components/NextLevelDisplay.jsx

import React from "react";

function NextLevelDisplay({ currentLevelIndex, levels }) {
  const nextIndex = currentLevelIndex + 1;
  const level = levels[nextIndex];
  if (!level) return null;
  return (
    <div className="text-center">
      <div className="font-bold text-xl">PRÓXIMO</div>
      <div>
        SB — {level.smallBlind} &nbsp; BB — {level.bigBlind}
        {level.ante > 0 && (
          <>
            &nbsp; ANTE — {level.ante}
          </>
        )}
      </div>
    </div>
  );
}

export default NextLevelDisplay;
