// src/store/sessionStore.js

const SESSION_KEY = "pb:session:v1";
const BACKUP_KEY = "pb:session:v1:backup";
const CORRUPT_KEY = "pb:session:v1:corrupt";
export const SESSION_VERSION = 2;
export const MAX_PLAYERS = 30;
export const MAX_COSTS = 8;
export const MAX_CREDITORS = 10;
export const MAX_PAYMENTS = 200;
const MAX_REBUYS = 20;
const MAX_PAID_PLACES = 20;
export const MAX_AMOUNT_CENTS = 100000000;
const MAX_LABEL = 24;
const MAX_NAME = 40;
const MAX_NOTE = 80;

export const DEFAULT_CONFIG = {
  buyInCents: 4000,
  buyInChips: 10000,
  rebuyCents: 3000,
  rebuyChips: 8000,
  maxRebuys: 2,
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
  return Number.isFinite(number)
    ? Math.min(MAX_AMOUNT_CENTS, Math.max(0, Math.round(number)))
    : fallback;
}

function toChips(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

function cleanLabel(value, fallback) {
  const label = String(value ?? "").trim().slice(0, MAX_LABEL);
  return label || fallback;
}

function cleanName(value, fallback) {
  const name = String(value ?? "").trim().slice(0, MAX_NAME);
  return name || fallback;
}

export function normalizeConfig(raw) {
  const merged = { ...DEFAULT_CONFIG, ...(raw || {}) };

  return {
    buyInCents: toCents(merged.buyInCents, DEFAULT_CONFIG.buyInCents),
    buyInChips: toChips(merged.buyInChips, DEFAULT_CONFIG.buyInChips),
    rebuyCents: toCents(merged.rebuyCents, DEFAULT_CONFIG.rebuyCents),
    rebuyChips: toChips(merged.rebuyChips, DEFAULT_CONFIG.rebuyChips),
    maxRebuys: clampInt(merged.maxRebuys, 0, MAX_REBUYS, DEFAULT_CONFIG.maxRebuys),
    paidPlaces: clampInt(merged.paidPlaces, 1, MAX_PAID_PLACES, DEFAULT_CONFIG.paidPlaces),
  };
}

function normalizePlayer(raw, index) {
  const seat = Number(raw?.seat);

  return {
    id: typeof raw?.id === "string" && raw.id ? raw.id : newId("p"),
    name: String(raw?.name ?? `Jogador ${index + 1}`).trim().slice(0, MAX_NAME),
    seat: Number.isInteger(seat) && seat > 0 ? seat : null,
    rebuys: clampInt(raw?.rebuys, 0, MAX_REBUYS, 0),
  };
}

function normalizeCreditor(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = cleanName(raw.name, "");

  if (!name) return null;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId("x"),
    name,
  };
}

function normalizeCost(raw, playerIds, creditorIds) {
  if (!raw || typeof raw !== "object") return null;

  const participantIds = Array.from(
    new Set(
      (Array.isArray(raw.participantIds) ? raw.participantIds : []).filter((id) =>
        playerIds.has(id)
      )
    )
  );
  const creditorId =
    typeof raw.creditorId === "string" &&
    (playerIds.has(raw.creditorId) || creditorIds.has(raw.creditorId))
      ? raw.creditorId
      : "";

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId("c"),
    label: cleanLabel(raw.label, "Custo"),
    amountCents: toCents(raw.amountCents, 0),
    creditorId,
    participantIds,
  };
}

function normalizeWinner(raw) {
  const chips = Number(raw?.chips);

  return {
    playerId: typeof raw?.playerId === "string" ? raw.playerId : "",
    chips: Number.isFinite(chips) && chips > 0 ? Math.round(chips) : null,
  };
}

function normalizePayment(raw, validIds) {
  if (!raw || typeof raw !== "object") return null;

  const amountCents = toCents(raw.amountCents, 0);

  if (
    amountCents <= 0 ||
    !validIds.has(raw.fromId) ||
    !validIds.has(raw.toId) ||
    raw.fromId === raw.toId
  ) {
    return null;
  }

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newId("pay"),
    fromId: raw.fromId,
    toId: raw.toId,
    amountCents,
    note: String(raw.note ?? "").slice(0, MAX_NOTE),
    createdAt: Number(raw.createdAt) || Date.now(),
  };
}

function normalizeCash(raw, playerIds) {
  const holderId =
    typeof raw?.holderId === "string" && playerIds.has(raw.holderId) ? raw.holderId : null;

  return {
    inHand: raw?.inHand === true,
    holderId,
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
    costs: [],
    creditors: [],
    dealerSeat: null,
    winners: [],
    payments: [],
    cash: { inHand: false, holderId: null },
    live: null,
  };
}

function normalizeV2(raw) {
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

  const playerIds = new Set(players.map((player) => player.id));

  const creditors = [];
  const creditorIds = new Set();
  (Array.isArray(raw.creditors) ? raw.creditors : [])
    .slice(0, MAX_CREDITORS)
    .forEach((item) => {
      const creditor = normalizeCreditor(item);
      if (!creditor) return;
      if (creditorIds.has(creditor.id)) creditor.id = newId("x");
      creditorIds.add(creditor.id);
      creditors.push(creditor);
    });

  const costs = [];
  (Array.isArray(raw.costs) ? raw.costs : [])
    .slice(0, MAX_COSTS)
    .forEach((item) => {
      const cost = normalizeCost(item, playerIds, creditorIds);
      if (cost) costs.push(cost);
    });

  const dealerSeat = Number(raw.dealerSeat);
  const winners = (Array.isArray(raw.winners) ? raw.winners : [])
    .slice(0, MAX_PAID_PLACES)
    .map(normalizeWinner);

  const validIds = new Set([...playerIds, ...creditorIds]);
  const payments = (Array.isArray(raw.payments) ? raw.payments : [])
    .slice(0, MAX_PAYMENTS)
    .map((item) => normalizePayment(item, validIds))
    .filter(Boolean);

  return {
    version: SESSION_VERSION,
    id: typeof raw.id === "string" && raw.id ? raw.id : newId("s"),
    name: String(raw.name ?? "Torneio").trim().slice(0, 60) || "Torneio",
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    config: normalizeConfig(raw.config),
    players,
    costs,
    creditors,
    dealerSeat: Number.isInteger(dealerSeat) && dealerSeat > 0 ? dealerSeat : null,
    winners,
    payments,
    cash: normalizeCash(raw.cash, playerIds),
    live: normalizeLive(raw.live),
  };
}

export function migrateV1ToV2(raw) {
  const config = raw?.config || {};
  const basePlayers = Array.isArray(raw?.players) ? raw.players : [];
  const players = basePlayers.map(normalizePlayer);
  const rateioPlayers = basePlayers
    .map((player, index) => (player?.inRateio === false ? null : players[index].id))
    .filter(Boolean);

  const costs = [];
  const venueCents = toCents(config.venueCents, 0);
  const snacksCents = toCents(config.snacksCents, 0);

  if (venueCents > 0) {
    costs.push({
      id: newId("c"),
      label: "Salão",
      amountCents: venueCents,
      creditorId: "",
      participantIds: rateioPlayers,
    });
  }

  if (snacksCents > 0) {
    costs.push({
      id: newId("c"),
      label: "Snacks",
      amountCents: snacksCents,
      creditorId: "",
      participantIds: rateioPlayers,
    });
  }

  return normalizeV2({
    ...raw,
    version: SESSION_VERSION,
    config,
    players,
    costs,
    creditors: [],
    winners: (Array.isArray(raw?.winners) ? raw.winners : []).map((winner) => ({
      playerId: winner?.playerId,
      chips: winner?.chips,
    })),
    payments: [],
    cash: { inHand: false, holderId: null },
  });
}

export function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") return createDefaultSession();

  return Number(raw.version) === SESSION_VERSION ? normalizeV2(raw) : migrateV1ToV2(raw);
}

export function createSessionFromPrevious(previous) {
  const base = normalizeSession(previous);
  const idMap = new Map();
  const players = base.players.map((player) => {
    const id = newId("p");
    idMap.set(player.id, id);

    return {
      id,
      name: player.name,
      seat: null,
      rebuys: 0,
    };
  });

  const costs = base.costs.map((cost) => ({
    id: newId("c"),
    label: cost.label,
    amountCents: cost.amountCents,
    creditorId: idMap.get(cost.creditorId) ?? cost.creditorId,
    participantIds: cost.participantIds.map((id) => idMap.get(id)).filter(Boolean),
  }));

  return {
    ...createDefaultSession(),
    name: base.name,
    config: { ...base.config },
    players,
    costs,
    creditors: base.creditors.map((creditor) => ({ ...creditor })),
    winners: [],
    payments: [],
    cash: { inHand: false, holderId: null },
    dealerSeat: null,
    live: null,
  };
}

function safeStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function backupRaw(key, raw) {
  const storage = safeStorage();
  if (!storage || !raw) return;

  try {
    if (!storage.getItem(key)) storage.setItem(key, raw);
  } catch {
    // A full localStorage must not prevent the session from loading.
  }
}

export function loadSessionWithStatus() {
  const storage = safeStorage();

  if (!storage) return { session: createDefaultSession(), failed: false };

  let saved = null;

  try {
    saved = storage.getItem(SESSION_KEY);
  } catch {
    return { session: createDefaultSession(), failed: false };
  }

  if (!saved) return { session: createDefaultSession(), failed: false };

  try {
    const parsed = JSON.parse(saved);

    if (Number(parsed?.version) !== SESSION_VERSION) backupRaw(BACKUP_KEY, saved);

    return { session: normalizeSession(parsed), failed: false };
  } catch (error) {
    console.warn("Could not load session:", error);
    backupRaw(CORRUPT_KEY, saved);
    return { session: createDefaultSession(), failed: true };
  }
}

export function loadSession() {
  return loadSessionWithStatus().session;
}

export function persistSession(session) {
  const storage = safeStorage();
  if (!storage) return;

  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Could not save session:", error);
  }
}
