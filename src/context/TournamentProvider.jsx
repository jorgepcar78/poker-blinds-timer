// src/context/TournamentProvider.jsx

import React from "react";
import { TournamentContext } from "./TournamentContext";
import useTournament from "../hooks/useTournament";

function TournamentProvider({ children }) {
  const tournament = useTournament();

  return (
    <TournamentContext.Provider value={tournament}>
      {children}
    </TournamentContext.Provider>
  );
}

export default TournamentProvider;
