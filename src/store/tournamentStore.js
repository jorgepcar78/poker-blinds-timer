// src/store/tournamentStore.js

const LEVELS_KEY = "tournament-levels";
const MAX_LEVELS = 50;
const MAX_DURATION_MINUTES = 600;
const DEFAULT_DURATION = 20;

export const DEFAULT_LEVELS = [
  { smallBlind: 50, bigBlind: 100, ante: 0, duration: 20 },
  { smallBlind: 100, bigBlind: 200, ante: 0, duration: 20 },
  { smallBlind: 150, bigBlind: 300, ante: 0, duration: 20 },
  { smallBlind: 200, bigBlind: 400, ante: 0, duration: 20 },
  { smallBlind: 300, bigBlind: 600, ante: 0, duration: 20 },
  { smallBlind: 400, bigBlind: 800, ante: 0, duration: 20 },
  { smallBlind: 600, bigBlind: 1200, ante: 0, duration: 20 },
  { smallBlind: 1000, bigBlind: 2000, ante: 0, duration: 20 },
  { smallBlind: 1500, bigBlind: 3000, ante: 0, duration: 20 },
];

function cloneLevels(levels) {
  return levels.map((level) => ({ ...level }));
}

function toWholeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function buildLevels(blinds, duration) {
  return blinds.map(([smallBlind, bigBlind]) => ({
    smallBlind,
    bigBlind,
    ante: 0,
    duration,
  }));
}

export const LEVEL_PRESETS = [
  {
    id: "turbo",
    name: "Turbo · 5 min",
    levels: buildLevels(
      [
        [50, 100],
        [100, 200],
        [150, 300],
        [200, 400],
        [300, 600],
        [500, 1000],
        [800, 1600],
        [1200, 2400],
        [2000, 4000],
      ],
      5
    ),
  },
  {
    id: "regular",
    name: "Regular · 20 min",
    levels: cloneLevels(DEFAULT_LEVELS),
  },
  {
    id: "deep",
    name: "Deep stack · 30 min",
    levels: buildLevels(
      [
        [25, 50],
        [50, 100],
        [75, 150],
        [100, 200],
        [150, 300],
        [200, 400],
        [300, 600],
        [400, 800],
        [600, 1200],
        [800, 1600],
        [1200, 2400],
      ],
      30
    ),
  },
];

export function normalizeLevels(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return cloneLevels(DEFAULT_LEVELS);
  }

  return raw.slice(0, MAX_LEVELS).map((level) => ({
    smallBlind: toWholeNumber(level?.smallBlind),
    bigBlind: toWholeNumber(level?.bigBlind),
    ante: toWholeNumber(level?.ante),
    duration:
      Math.min(MAX_DURATION_MINUTES, toWholeNumber(level?.duration, DEFAULT_DURATION)) ||
      DEFAULT_DURATION,
  }));
}

export function loadLevels() {
  try {
    const saved = localStorage.getItem(LEVELS_KEY);
    return saved ? normalizeLevels(JSON.parse(saved)) : cloneLevels(DEFAULT_LEVELS);
  } catch (error) {
    console.warn("Could not load levels:", error);
    return cloneLevels(DEFAULT_LEVELS);
  }
}

export function persistLevels(levels) {
  try {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
  } catch (error) {
    console.warn("Could not save levels:", error);
  }
}
