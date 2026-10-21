// src/components/Controls.jsx

import React from "react";

function Controls({ isRunning, start, pause, nextLevel, previousLevel, className }) {
  const buttonClass =
    "rounded-xl px-4 py-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-6 sm:text-lg";

  return (
    <div className={className}>
      <button
        type="button"
        className={`${buttonClass} bg-gray-800 hover:bg-gray-700`}
        onClick={previousLevel}
      >
        Anterior
      </button>
      <button
        type="button"
        className={`${buttonClass} ${isRunning ? "bg-amber-600 hover:bg-amber-500" : "bg-green-600 hover:bg-green-500"}`}
        onClick={isRunning ? pause : start}
      >
        {isRunning ? "Pausar" : "Iniciar"}
      </button>
      <button
        type="button"
        className={`${buttonClass} bg-gray-800 hover:bg-gray-700`}
        onClick={nextLevel}
      >
        Próximo
      </button>
    </div>
  );
}

export default Controls;
