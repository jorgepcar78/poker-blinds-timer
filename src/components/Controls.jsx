// src/components/Controls.jsx

import React from "react";
import { Button } from "./ui/ui";

function Controls({
  isRunning,
  isFinished,
  start,
  pause,
  nextLevel,
  previousLevel,
  className = "",
}) {
  return (
    <div className={`grid w-full grid-cols-3 gap-2 ${className}`}>
      <Button
        variant="secondary"
        size="xs"
        icon="skip_previous"
        onClick={previousLevel}
        className="w-full"
      >
        Anterior
      </Button>
      <Button
        size="xs"
        icon={isRunning ? "pause" : "play_arrow"}
        onClick={isRunning ? pause : start}
        className="w-full"
      >
        {isRunning ? "Pausar" : "Iniciar"}
      </Button>
      <Button
        variant="secondary"
        size="xs"
        icon="skip_next"
        onClick={nextLevel}
        disabled={isFinished}
        className="w-full"
      >
        Próximo
      </Button>
    </div>
  );
}

export default Controls;
