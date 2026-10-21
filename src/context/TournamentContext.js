// src/context/TournamentContext.js

import { createContext, useContext } from "react";

export const TournamentContext = createContext(null);

export function useTournamentContext() {
  const context = useContext(TournamentContext);

  if (!context) {
    throw new Error("useTournamentContext must be used inside TournamentProvider");
  }

  return context;
}
