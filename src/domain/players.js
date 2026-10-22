// src/domain/players.js

export const MAX_PLAYER_NAME_LENGTH = 40;

// Accepts one name per line, commas or semicolons, with optional list markers.
export function parsePlayerNames(raw) {
  return String(raw ?? "")
    .split(/[\r\n,;]+/)
    .map((line) =>
      line
        .replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, MAX_PLAYER_NAME_LENGTH)
    )
    .filter(Boolean);
}
