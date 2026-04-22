// src/components/BlindsDisplay.jsx

import React from "react";
function BlindsDisplay({ level }) {
  return (
    <div className="text-center">
      <div className="text-xl">
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

export default BlindsDisplay;
