// src/live/LivePublisher.jsx

import { useEffect, useRef } from "react";
import { useSessionContext } from "../context/SessionContext";
import { useTournamentContext } from "../context/TournamentContext";
import { updateLiveSession } from "./liveApi";
import { buildLivePayload, liveStateKey } from "./livePayload";

const HEARTBEAT_MS = 15000;

export default function LivePublisher() {
  const { session, setLiveStatus, setLiveError } = useSessionContext();
  const { levels, currentLevelIndex, remainingTime, isRunning, isFinished } =
    useTournamentContext();

  const live = session.live;
  const payloadRef = useRef(null);

  const payload = {
    name: session.name,
    levels,
    currentLevelIndex,
    remainingTime,
    isRunning,
    isFinished,
  };

  const key = liveStateKey({
    name: session.name,
    levels,
    currentLevelIndex,
    isRunning,
    isFinished,
  });

  useEffect(() => {
    payloadRef.current = payload;
  });

  useEffect(() => {
    if (!live?.active || !live.id || !live.hostToken) return undefined;

    let cancelled = false;

    const publish = async () => {
      const current = payloadRef.current;
      if (!current) return;

      try {
        await updateLiveSession(live.id, live.hostToken, buildLivePayload(current));
        if (cancelled) return;
        setLiveStatus("live");
        setLiveError("");
      } catch (error) {
        if (cancelled) return;
        setLiveStatus("error");
        setLiveError(error.message);
      }
    };

    publish();
    const interval = setInterval(publish, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [live?.active, live?.id, live?.hostToken, key, setLiveStatus, setLiveError]);

  return null;
}
