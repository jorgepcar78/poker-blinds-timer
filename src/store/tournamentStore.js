// src/store/tournamentStore.js

const defaultLevels = [
  { smallBlind: 50, bigBlind: 100, ante: 0, duration: 20 },
  { smallBlind: 100, bigBlind: 200, ante: 0, duration: 20 },
  { smallBlind: 150, bigBlind: 300, ante: 0, duration: 20 },
  { smallBlind: 200, bigBlind: 400, ante: 0, duration: 20 },
  { smallBlind: 300, bigBlind: 600, ante: 0, duration: 20 },
  { smallBlind: 400, bigBlind: 800, ante: 0, duration: 20 },
  { smallBlind: 600, bigBlind: 1200, ante: 0, duration: 20 },
  { smallBlind: 1000, bigBlind: 2000, ante: 0, duration: 20 },
  { smallBlind: 1500, bigBlind: 3000, ante: 0, duration: 20 }
];

function loadLevels() {
  const saved = localStorage.getItem("tournament-levels");
  let levels;
  if (saved) {
    levels = JSON.parse(saved);
  } else {
    levels = defaultLevels;
  }
  return levels.map(level => ({
    ...level,
    duration: level.duration * 60 // convert minutes to seconds
  }));
}

const tournamentState = {
  currentLevelIndex: 0,
  isRunning: false,
  remainingTime: 600, // This is the initial remaining time in seconds (10 minutes)
  levels: loadLevels()
};

export default tournamentState;