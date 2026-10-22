import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateProportional,
  splitEqual,
  computePool,
  computeRateio,
  buildSettlement,
} from "../src/domain/settlement.js";

const config = {
  buyInCents: 4000,
  buyInChips: 10000,
  rebuyCents: 3000,
  rebuyChips: 8000,
  maxRebuys: 2,
  venueCents: 10000,
  snacksCents: 8000,
  paidPlaces: 2,
};

const players = [
  { id: "p1", name: "Ana", rebuys: 2, inRateio: true },
  { id: "p2", name: "João", rebuys: 1, inRateio: true },
  { id: "p3", name: "Maria", rebuys: 1, inRateio: true },
  { id: "p4", name: "Pedro", rebuys: 1, inRateio: true },
  { id: "p5", name: "Lia", rebuys: 0, inRateio: true },
  { id: "p6", name: "Rui", rebuys: 0, inRateio: true },
  { id: "p7", name: "Bia", rebuys: 0, inRateio: true },
  { id: "p8", name: "Caio", rebuys: 0, inRateio: true },
];

const winners = [
  { playerId: "p3", chips: 80000 },
  { playerId: "p2", chips: 40000 },
];

test("splitEqual distributes the remainder in cents", () => {
  assert.deepEqual(splitEqual(18000, 7), [2572, 2572, 2572, 2571, 2571, 2571, 2571]);
  assert.equal(splitEqual(18000, 7).reduce((sum, value) => sum + value, 0), 18000);
  assert.deepEqual(splitEqual(10000, 3), [3334, 3333, 3333]);
});

test("allocateProportional keeps the pool exact", () => {
  assert.deepEqual(allocateProportional(47000, [80000, 40000]), [31333, 15667]);
  assert.deepEqual(allocateProportional(50000, [40000, 40000, 40000]), [16667, 16667, 16666]);
  assert.deepEqual(allocateProportional(100, [1, 1, 1]), [34, 33, 33]);
});

test("allocateProportional is deterministic and sums exactly", () => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let run = 0; run < 200; run += 1) {
    const total = Math.floor(random() * 1000000);
    const weights = Array.from({ length: 1 + Math.floor(random() * 8) }, () =>
      Math.floor(random() * 200000)
    );
    if (weights.every((weight) => weight === 0)) weights[0] = 1;

    const result = allocateProportional(total, weights);
    assert.ok(result, "allocation should succeed");
    assert.equal(
      result.reduce((sum, value) => sum + value, 0),
      total,
      "allocation must sum to total"
    );
  }
});

test("computePool uses buy-ins and rebuys", () => {
  const pool = computePool(config, players);
  assert.equal(pool.poolCents, 47000);
  assert.equal(pool.chipsInPlay, 120000);
  assert.equal(pool.totalRebuys, 5);
});

test("computeRateio splits venue + snacks among participants", () => {
  const rateio = computeRateio(config, players);
  assert.equal(rateio.totalCents, 18000);
  assert.equal(rateio.participants, 8);
  assert.equal(rateio.byPlayer.p1, 2250);

  const withOptOut = computeRateio(config, players.map((player) =>
    player.id === "p8" ? { ...player, inRateio: false } : player
  ));
  assert.equal(withOptOut.participants, 7);
  assert.equal(withOptOut.byPlayer.p8, undefined);
  assert.equal(
    Object.values(withOptOut.byPlayer).reduce((sum, value) => sum + value, 0),
    18000
  );
});

test("buildSettlement computes the user's usual game", () => {
  const settlement = buildSettlement({ config, players, winners });

  assert.equal(settlement.isComplete, true);
  assert.deepEqual(settlement.errors, []);
  assert.equal(settlement.pool.poolCents, 47000);
  assert.equal(settlement.pool.chipsInPlay, 120000);
  assert.equal(settlement.rateio.totalCents, 18000);

  const maria = settlement.rows.find((row) => row.id === "p3");
  const joao = settlement.rows.find((row) => row.id === "p2");
  const ana = settlement.rows.find((row) => row.id === "p1");

  assert.equal(maria.gameCents, 7000);
  assert.equal(maria.rateioCents, 2250);
  assert.equal(maria.totalInvestedCents, 9250);
  assert.equal(maria.prizeCents, 31333);
  assert.equal(maria.balanceCents, 22083);

  assert.equal(joao.prizeCents, 15667);
  assert.equal(joao.balanceCents, 6417);

  assert.equal(ana.totalInvestedCents, 12250);
  assert.equal(ana.balanceCents, -12250);

  assert.equal(settlement.totals.totalInvestedCents, 65000);
  assert.equal(settlement.totals.prizesCents, 47000);
  assert.equal(settlement.totals.costsCents, 18000);
  assert.equal(settlement.totals.cashDifferenceCents, 0);
  assert.equal(settlement.totals.balanceCents, -18000);
});

test("missing winners produce a warning and an incomplete preview", () => {
  const settlement = buildSettlement({
    config,
    players,
    winners: [{ playerId: "p3", chips: 80000 }],
  });

  assert.equal(settlement.isComplete, false);
  assert.ok(settlement.warnings.some((warning) => warning.code === "MISSING_WINNERS"));
  assert.equal(settlement.payouts.length, 1);
  assert.equal(settlement.payouts[0].prizeCents, 47000);
});

test("rebuy above the cap is blocked", () => {
  const overCap = players.map((player) =>
    player.id === "p1" ? { ...player, rebuys: 3 } : player
  );
  const settlement = buildSettlement({ config, players: overCap, winners });

  assert.equal(settlement.isComplete, false);
  assert.ok(settlement.errors.some((error) => error.code === "INVALID_REBUY_COUNT"));
});

test("winner chips cannot exceed chips in play", () => {
  const settlement = buildSettlement({
    config,
    players,
    winners: [
      { playerId: "p3", chips: 130000 },
      { playerId: "p2", chips: 40000 },
    ],
  });

  assert.equal(settlement.isComplete, false);
  assert.ok(settlement.errors.some((error) => error.code === "WINNER_CHIPS_EXCEED_PLAY"));
});

test("duplicate winners are blocked", () => {
  const settlement = buildSettlement({
    config,
    players,
    winners: [
      { playerId: "p3", chips: 80000 },
      { playerId: "p3", chips: 40000 },
    ],
  });

  assert.equal(settlement.isComplete, false);
  assert.ok(settlement.errors.some((error) => error.code === "DUPLICATE_WINNER"));
});

test("optimized rateio payout distributes cents exactly", () => {
  const settlement = buildSettlement({
    config: { ...config, venueCents: 18000, snacksCents: 0 },
    players: players.map((player) =>
      player.id === "p8" ? { ...player, inRateio: false } : player
    ),
    winners,
  });

  const shares = settlement.rows
    .filter((row) => row.inRateio)
    .map((row) => row.rateioCents)
    .sort((a, b) => b - a);

  assert.deepEqual(shares, [2572, 2572, 2572, 2571, 2571, 2571, 2571]);
});
