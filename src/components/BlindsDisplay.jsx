// src/components/BlindsDisplay.jsx

import React from "react";
function BlindsDisplay({ level }) {
  return (
    <div className="text-center space-y-1">
      <div>SB {level.smallBlind}</div>
      <div>BB {level.bigBlind}</div>
      <div>ANTE {level.ante}</div>
    </div>
  );
}

export default BlindsDisplay;
