// src/context/SessionProvider.jsx

import React from "react";
import { SessionContext } from "./SessionContext";
import useSession from "../hooks/useSession";

function SessionProvider({ children }) {
  const session = useSession();

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export default SessionProvider;
