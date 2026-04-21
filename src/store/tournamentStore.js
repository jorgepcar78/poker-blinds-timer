// src/store/tournamentStore.js

const tournamentState = {
  currentLevelIndex: 0,
  isRunning: false,
  remainingTime: 600,
  levels: [
    {
      smallBlind: 25,
      bigBlind: 50,
      ante: 0,
      duration: 60,
    },
    {
      smallBlind: 50,
      bigBlind: 100,
      ante: 0,
      duration: 60,
    },
  ],
};

export default tournamentState;
