// src/live/livePayload.js

export function buildLivePayload({
  name,
  levels,
  currentLevelIndex,
  remainingTime,
  isRunning,
  isFinished,
}) {
  return {
    name: String(name ?? "Torneio"),
    levels: (levels || []).map((level) => ({
      smallBlind: level.smallBlind,
      bigBlind: level.bigBlind,
      ante: level.ante,
      duration: level.duration,
    })),
    currentLevelIndex: Math.max(0, Math.round(Number(currentLevelIndex) || 0)),
    remainingTime: Math.max(0, Math.round(Number(remainingTime) || 0)),
    isRunning: Boolean(isRunning),
    isFinished: Boolean(isFinished),
    publishedAt: Date.now(),
  };
}

export function liveStateKey({ name, levels, currentLevelIndex, isRunning, isFinished }) {
  const levelKey = (levels || [])
    .map((level) => `${level.smallBlind}/${level.bigBlind}/${level.ante}/${level.duration}`)
    .join("|");

  return [
    String(name ?? ""),
    Math.round(Number(currentLevelIndex) || 0),
    isRunning ? 1 : 0,
    isFinished ? 1 : 0,
    levelKey,
  ].join("::");
}
