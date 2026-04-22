// src/components/Controls.jsx

import React from "react";

function Controls({ isRunning, start, pause, nextLevel, previousLevel, className }) {
  return (
    <div className={className}>
      <button className="px-6 py-3 text-lg rounded-xl bg-gray-800" onClick={previousLevel}>Anterior</button>
      <button
        className="px-6 py-3 text-lg rounded-xl bg-green-600"
        onClick={isRunning ? pause : start}
      >
        {isRunning ? "Pausar" : "Iniciar"}
      </button>
      <button
        className="px-6 py-3 text-lg rounded-xl bg-gray-800"
        onClick={nextLevel}
      >
        Próximo
      </button>
    </div>
  );
}

export default Controls;
