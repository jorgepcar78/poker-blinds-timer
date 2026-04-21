// src/components/TimerDisplay.jsx

import React from "react";
import { formatTime } from "../utils/time";

function TimerDisplay({ time }) {
  return (
    <div className="text-6xl font-mono">{formatTime(time)}</div>
  );
}

export default TimerDisplay;
