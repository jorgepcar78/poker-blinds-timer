// src/context/SessionContext.js

import { createContext, useContext } from "react";

export const SessionContext = createContext(null);

export function useSessionContext() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSessionContext must be used inside SessionProvider");
  }

  return context;
}
