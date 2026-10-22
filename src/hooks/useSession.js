// src/hooks/useSession.js

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSettlement } from "../domain/settlement";
import {
  createSessionFromPrevious,
  loadSession,
  MAX_PLAYERS,
  normalizeConfig,
  persistSession,
} from "../store/sessionStore";

function clampInt(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function randomInt(max) {
  if (max <= 0) return 0;

  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    return Math.floor(Math.random() * max);
  }

  const buffer = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let value;

  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % max;
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function newPlayer(name, index) {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `p_${crypto.randomUUID()}`
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: String(name ?? "").trim().slice(0, 40) || `Jogador ${index + 1}`,
    seat: null,
    rebuys: 0,
    inRateio: true,
  };
}

export default function useSession() {
  const [session, setSession] = useState(loadSession);
  const [liveStatus, setLiveStatus] = useState("idle");
  const [liveError, setLiveError] = useState("");

  useEffect(() => {
    persistSession(session);
  }, [session]);

  const updateSession = useCallback((updater) => {
    setSession((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return { ...next, updatedAt: Date.now() };
    });
  }, []);

  const renameSession = useCallback(
    (name) => {
      updateSession((prev) => ({
        ...prev,
        name: String(name ?? "").slice(0, 60),
      }));
    },
    [updateSession]
  );

  const updateConfig = useCallback(
    (patch) => {
      updateSession((prev) => {
        const config = normalizeConfig({ ...prev.config, ...patch });
        const winners = Array.from(
          { length: config.paidPlaces },
          (_, index) => prev.winners[index] ?? { playerId: "", chips: null }
        );

        return { ...prev, config, winners };
      });
    },
    [updateSession]
  );

  const addPlayer = useCallback(
    (name) => {
      updateSession((prev) => {
        if (prev.players.length >= MAX_PLAYERS) return prev;
        return {
          ...prev,
          players: [...prev.players, newPlayer(name, prev.players.length)],
        };
      });
    },
    [updateSession]
  );

  const addPlayersByNames = useCallback(
    (names) => {
      updateSession((prev) => {
        const room = MAX_PLAYERS - prev.players.length;
        if (room <= 0) return prev;

        const cleanNames = (Array.isArray(names) ? names : [])
          .map((name) => String(name ?? "").trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, room);

        if (!cleanNames.length) return prev;

        const players = cleanNames.map((name, index) =>
          newPlayer(name, prev.players.length + index)
        );

        return { ...prev, players: [...prev.players, ...players] };
      });
    },
    [updateSession]
  );

  const removePlayer = useCallback(
    (playerId) => {
      updateSession((prev) => {
        const removed = prev.players.find((player) => player.id === playerId);

        return {
          ...prev,
          players: prev.players.filter((player) => player.id !== playerId),
          winners: prev.winners.map((winner) =>
            winner.playerId === playerId ? { playerId: "", chips: null } : winner
          ),
          dealerSeat:
            removed && removed.seat === prev.dealerSeat ? null : prev.dealerSeat,
        };
      });
    },
    [updateSession]
  );

  const removeAllPlayers = useCallback(() => {
    updateSession((prev) => ({
      ...prev,
      players: [],
      winners: Array.from({ length: prev.config.paidPlaces }, () => ({
        playerId: "",
        chips: null,
        pix: [],
      })),
      dealerSeat: null,
    }));
  }, [updateSession]);

  const renamePlayer = useCallback(
    (playerId, name) => {
      updateSession((prev) => ({
        ...prev,
        players: prev.players.map((player) =>
          player.id === playerId ? { ...player, name: String(name ?? "").slice(0, 40) } : player
        ),
      }));
    },
    [updateSession]
  );

  const setRebuys = useCallback(
    (playerId, value) => {
      updateSession((prev) => ({
        ...prev,
        players: prev.players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                rebuys: clampInt(value, 0, prev.config.maxRebuys, 0),
              }
            : player
        ),
      }));
    },
    [updateSession]
  );

  const adjustRebuys = useCallback(
    (playerId, delta) => {
      setSession((prev) => ({
        ...prev,
        updatedAt: Date.now(),
        players: prev.players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                rebuys: clampInt(player.rebuys + delta, 0, prev.config.maxRebuys, 0),
              }
            : player
        ),
      }));
    },
    []
  );

  const toggleRateio = useCallback(
    (playerId) => {
      updateSession((prev) => ({
        ...prev,
        players: prev.players.map((player) =>
          player.id === playerId ? { ...player, inRateio: !player.inRateio } : player
        ),
      }));
    },
    [updateSession]
  );

  const setAllRateio = useCallback(
    (value) => {
      updateSession((prev) => ({
        ...prev,
        players: prev.players.map((player) => ({ ...player, inRateio: Boolean(value) })),
      }));
    },
    [updateSession]
  );

  const sortearPosicoes = useCallback(() => {
    updateSession((prev) => {
      if (!prev.players.length) return prev;

      const shuffled = shuffle(prev.players);
      const seatById = new Map(
        shuffled.map((player, index) => [player.id, index + 1])
      );
      const players = prev.players.map((player) => ({
        ...player,
        seat: seatById.get(player.id) ?? null,
      }));

      return {
        ...prev,
        players,
        dealerSeat: randomInt(players.length) + 1,
      };
    });
  }, [updateSession]);

  const sortearDealer = useCallback(() => {
    updateSession((prev) => {
      const occupiedSeats = prev.players
        .map((player) => player.seat)
        .filter((seat) => Number.isInteger(seat) && seat > 0);

      if (!occupiedSeats.length) return prev;

      return {
        ...prev,
        dealerSeat: occupiedSeats[randomInt(occupiedSeats.length)],
      };
    });
  }, [updateSession]);

  const setDealerSeat = useCallback(
    (seat) => {
      updateSession((prev) => ({
        ...prev,
        dealerSeat: Number.isInteger(seat) && seat > 0 ? seat : null,
      }));
    },
    [updateSession]
  );

  const swapSeats = useCallback(
    (seatA, seatB) => {
      if (seatA === seatB) return;

      updateSession((prev) => {
        const playerA = prev.players.find((player) => player.seat === seatA);
        const playerB = prev.players.find((player) => player.seat === seatB);

        if (!playerA && !playerB) return prev;

        return {
          ...prev,
          players: prev.players.map((player) => {
            if (playerA && player.id === playerA.id) return { ...player, seat: seatB };
            if (playerB && player.id === playerB.id) return { ...player, seat: seatA };
            return player;
          }),
        };
      });
    },
    [updateSession]
  );

  const placePlayer = useCallback(
    (playerId, seat) => {
      updateSession((prev) => {
        const player = prev.players.find((item) => item.id === playerId);
        if (!player) return prev;

        if (player.seat && player.seat !== seat) {
          // Reuse the swap semantics when the player is already seated.
          const occupant = prev.players.find((item) => item.seat === seat);
          return {
            ...prev,
            players: prev.players.map((item) => {
              if (item.id === player.id) return { ...item, seat };
              if (occupant && item.id === occupant.id) return { ...item, seat: player.seat };
              return item;
            }),
          };
        }

        return {
          ...prev,
          players: prev.players.map((item) => {
            if (item.id === player.id) return { ...item, seat };
            if (item.seat === seat) return { ...item, seat: null };
            return item;
          }),
        };
      });
    },
    [updateSession]
  );

  const setWinner = useCallback(
    (index, patch) => {
      updateSession((prev) => {
        const count = Math.max(prev.config.paidPlaces, index + 1);
        const winners = Array.from(
          { length: count },
          (_, slot) => prev.winners[slot] ?? { playerId: "", chips: null }
        );

        winners[index] = { ...winners[index], ...patch };

        return { ...prev, winners };
      });
    },
    [updateSession]
  );

  const clearWinners = useCallback(() => {
    updateSession((prev) => ({
      ...prev,
      winners: Array.from({ length: prev.config.paidPlaces }, () => ({
        playerId: "",
        chips: null,
      })),
    }));
  }, [updateSession]);

  const startNewSession = useCallback(() => {
    setSession((prev) => createSessionFromPrevious(prev));
    setLiveStatus("idle");
    setLiveError("");
  }, []);

  const setLive = useCallback(
    (live) => {
      updateSession((prev) => ({
        ...prev,
        live: live ? { ...live, active: true } : null,
      }));
    },
    [updateSession]
  );

  const settlement = useMemo(
    () =>
      buildSettlement({
        config: session.config,
        players: session.players,
        winners: session.winners,
      }),
    [session.config, session.players, session.winners]
  );

  const winnerSlots = useMemo(
    () =>
      Array.from(
        { length: session.config.paidPlaces },
        (_, index) => session.winners[index] ?? { playerId: "", chips: null }
      ),
    [session.config.paidPlaces, session.winners]
  );

  const seatCount = Math.max(
    session.players.length,
    ...session.players.map((player) => player.seat ?? 0),
    session.dealerSeat ?? 0,
    0
  );

  const unseated = session.players.filter((player) => !player.seat);

  return {
    session,
    config: session.config,
    players: session.players,
    winnerSlots,
    seatCount,
    dealerSeat: session.dealerSeat,
    unseated,
    settlement,
    liveStatus,
    liveError,
    setLiveStatus,
    setLiveError,
    renameSession,
    updateConfig,
    addPlayer,
    addPlayersByNames,
    removePlayer,
    removeAllPlayers,
    renamePlayer,
    setRebuys,
    adjustRebuys,
    toggleRateio,
    setAllRateio,
    sortearPosicoes,
    sortearDealer,
    setDealerSeat,
    swapSeats,
    placePlayer,
    setWinner,
    clearWinners,
    startNewSession,
    setLive,
  };
}
