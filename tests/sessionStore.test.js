import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSession } from "../src/store/sessionStore.js";

test("normalizeSession keeps one cleaned PIX key per winner", () => {
  const session = normalizeSession({
    id: "s_test",
    name: "Torneio",
    players: [
      { id: "p1", name: "Ana", seat: 1, rebuys: 0, inRateio: true },
      { id: "p2", name: "João", seat: 2, rebuys: 0, inRateio: true },
    ],
    config: { paidPlaces: 2 },
    winners: [
      { playerId: "p1", chips: 10000, pix: ["  11999998888  ", "", "ana@example.com"] },
      { playerId: "p2", chips: 5000, pix: "joao@example.com" },
    ],
  });

  assert.deepEqual(session.winners[0].pix, ["11999998888"]);
  assert.deepEqual(session.winners[1].pix, ["joao@example.com"]);
});

test("normalizeSession limits each winner to one PIX key", () => {
  const session = normalizeSession({
    players: [
      { id: "p1", name: "Ana", rebuys: 0, inRateio: true },
      { id: "p2", name: "João", rebuys: 0, inRateio: true },
    ],
    winners: [
      {
        playerId: "p1",
        chips: 10000,
        pix: ["1", "2", "3", "4", "5", "6"],
      },
    ],
  });

  assert.deepEqual(session.winners[0].pix, ["1"]);
});
