// src/store/sessionStore.js

const SESSION_KEY = "pb:session:v1";
const SESSION_VERSION = 1;
export const MAX_PLAYERS = 30;
const MAX_REBUYS = 20;
const MAX_PAID_PLACES = 20;

export const DEFAULT_CONFIG = {
  buyInCents: 4000,
  buyInChips: 10000,
  rebuyCents: 3000,
  rebuyChips: 8000,
  maxRebuys: 2,
  venueCents: 0,
  snacksCents: 0,
  paidPlaces: 2,
};

function newId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function toCents(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

function toChips(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

export function normalizeConfig(raw) {
  const merged = { ...DEFAULT_CONFIG, ...(raw || {}) };

  return {
    buyInCents: toCents(merged.buyInCents, DEFAULT_CONFIG.buyInCents),
    buyInChips: toChips(merged.buyInChips, DEFAULT_CONFIG.buyInChips),
    rebuyCents: toCents(merged.rebuyCents, DEFAULT_CONFIG.rebuyCents),
    rebuyChips: toChips(merged.rebuyChips, DEFAULT_CONFIG.rebuyChips),
    maxRebuys: clampInt(merged.maxRebuys, 0, MAX_REBUYS, DEFAULT_CONFIG.maxRebuys),
    venueCents: toCents(merged.venueCents, 0),
    snacksCents: toCents(merged.snacksCents, 0),
    paidPlaces: clampInt(merged.paidPlaces, 1, MAX_PAID_PLACES, DEFAULT_CONFIG.paidPlaces),
  };
}

function normalizePlayer(raw, index) {
  const seat = Number(raw?.seat);

  return {
    id: typeof raw?.id === "string" && raw.id ? raw.id : newId("p"),
    name: String(raw?.name ?? `Jogador ${index + 1}`).trim().slice(0, 40),
    seat: Number.isInteger(seat) && seat > 0 ? seat : null,
    rebuys: clampInt(raw?.rebuys, 0, MAX_REBUYS, 0),
    inRateio: raw?.inRateio !== false,
  };
}

function normalizePix(raw) {
  const values = Array.isArray(raw?.pix)
    ? raw.pix
    : typeof raw?.pix === "string"
      ? [raw.pix]
      : [];

  return values
    .map((value) => String(value ?? "").trim().slice(0, 140))
    .filter(Boolean)
    .slice(0, 1);
}

function normalizeWinner(raw) {
  const chips = Number(raw?.chips);

  return {
    playerId: typeof raw?.playerId === "string" ? raw.playerId : "",
    chips: Number.isFinite(chips) && chips > 0 ? Math.round(chips) : null,
    pix: normalizePix(raw),
  };
}

function normalizeLive(raw) {
  if (!raw || typeof raw.id !== "string" || typeof raw.hostToken !== "string") {
    return null;
  }

  return {
    id: raw.id,
    hostToken: raw.hostToken,
    active: raw.active !== false,
  };
}

export function createDefaultSession() {
  const now = Date.now();

  return {
    version: SESSION_VERSION,
    id: newId("s"),
    name: "Torneio",
    createdAt: now,
    updatedAt: now,
    config: { ...DEFAULT_CONFIG },
    players: [],
    dealerSeat: null,
    winners: [],
    live: null,
  };
}

export function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") return createDefaultSession();

  const players = Array.isArray(raw.players)
    ? raw.players.slice(0, MAX_PLAYERS).map(normalizePlayer)
    : [];

  const usedIds = new Set();
  players.forEach((player) => {
    if (usedIds.has(player.id)) player.id = newId("p");
    usedIds.add(player.id);
  });

  const usedSeats = new Set();
  players.forEach((player) => {
    if (player.seat === null) return;
    if (usedSeats.has(player.seat)) player.seat = null;
    else usedSeats.add(player.seat);
  });

  const dealerSeat = Number(raw.dealerSeat);
  const winners = Array.isArray(raw.winners)
    ? raw.winners.slice(0, MAX_PAID_PLACES).map(normalizeWinner)
    : [];

  return {
    version: SESSION_VERSION,
    id: typeof raw.id === "string" && raw.id ? raw.id : newId("s"),
    name: String(raw.name ?? "Torneio").trim().slice(0, 60) || "Torneio",
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    config: normalizeConfig(raw.config),
    players,
    dealerSeat: Number.isInteger(dealerSeat) && dealerSeat > 0 ? dealerSeat : null,
    winners,
    live: normalizeLive(raw.live),
  };
}

export function createSessionFromPrevious(previous) {
  const base = normalizeSession(previous);

  return {
    ...createDefaultSession(),
    name: base.name,
    config: { ...base.config },
    players: base.players.map((player) => ({
      id: newId("p"),
      name: player.name,
      seat: null,
      rebuys: 0,
      inRateio: player.inRateio,
    })),
    winners: [],
    dealerSeat: null,
    live: null,
  };
}

export function loadSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? normalizeSession(JSON.parse(saved)) : createDefaultSession();
  } catch (error) {
    console.warn("Could not load session:", error);
    return createDefaultSession();
  }
}

export function persistSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Could not save session:", error);
  }
}
