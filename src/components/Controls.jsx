// src/components/Controls.jsx

import React from "react";

function Controls({ isRunning, start, pause, nextLevel, previousLevel }) {
  return (
    <div className="flex space-x-4">
      <button className="px-4 py-2 bg-gray-800 rounded-lg text-lg" onClick={previousLevel}>Anterior</button>
      <button
        className="px-4 py-2 bg-green-600 rounded-lg text-lg"
        onClick={isRunning ? pause : start}
      >
        {isRunning ? "Pausar" : "Iniciar"}
      </button>
      <button
        className="px-4 py-2 bg-gray-800 rounded-lg text-lg"
        onClick={nextLevel}
      >
        Próximo
      </button>
    </div>
  );
}

export default Controls;
