import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateReais,
  splitEqual,
  computePool,
  computeCosts,
  buildSettlement,
  buildTransferPlan,
} from "../src/domain/settlement.js";

const config = {
  buyInCents: 4000,
  buyInChips: 10000,
  rebuyCents: 3000,
  rebuyChips: 8000,
  maxRebuys: 2,
  paidPlaces: 2,
};

const players = [
  { id: "p1", name: "Ana", rebuys: 2 },
  { id: "p2", name: "João", rebuys: 1 },
  { id: "p3", name: "Maria", rebuys: 1 },
  { id: "p4", name: "Pedro", rebuys: 1 },
  { id: "p5", name: "Lia", rebuys: 0 },
  { id: "p6", name: "Rui", rebuys: 0 },
  { id: "p7", name: "Bia", rebuys: 0 },
  { id: "p8", name: "Caio", rebuys: 0 },
];

const costs = [
  {
    id: "c1",
    label: "Salão",
    amountCents: 10000,
    creditorId: "p1",
    participantIds: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
  },
  {
    id: "c2",
    label: "Snacks",
    amountCents: 9000,
    creditorId: "p6",
    participantIds: ["p1", "p2", "p3", "p4", "p5", "p6"],
  },
];

const winners = [
  { playerId: "p3", chips: 80000 },
  { playerId: "p2", chips: 40000 },
];

function applyPlan(nodes, plan) {
  const balances = new Map(nodes.map((node) => [node.id, node.balanceCents]));

  plan.forEach((transfer) => {
    balances.set(transfer.fromId, balances.get(transfer.fromId) + transfer.amountCents);
    balances.set(transfer.toId, balances.get(transfer.toId) - transfer.amountCents);
  });

  return balances;
}

test("splitEqual distributes the remainder in cents", () => {
  assert.deepEqual(splitEqual(18000, 7), [2572, 2572, 2572, 2571, 2571, 2571, 2571]);
  assert.equal(splitEqual(18000, 7).reduce((sum, value) => sum + value, 0), 18000);
  assert.deepEqual(splitEqual(10000, 3), [3334, 3333, 3333]);
});

test("allocateReais rounds prizes to whole reais and keeps the total exact", () => {
  assert.deepEqual(allocateReais(32000, [80000, 40000]), [21300, 10700]);
  assert.deepEqual(allocateReais(47000, [80000, 40000]), [31300, 15700]);
  assert.deepEqual(allocateReais(32000, [1, 1, 1]), [10700, 10700, 10600]);
  assert.deepEqual(allocateReais(32050, [2, 1]), [21350, 10700]);
  assert.deepEqual(allocateReais(32050, [1, 2]), [10700, 21350]);

  let seed = 7;
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

    const result = allocateReais(total, weights);
    assert.ok(result, "allocation should succeed");
    assert.equal(
      result.reduce((sum, value) => sum + value, 0),
      total,
      "allocation must sum to the total"
    );
  }
});

test("computePool uses buy-ins and rebuys", () => {
  const pool = computePool(config, players);
  assert.equal(pool.poolCents, 47000);
  assert.equal(pool.chipsInPlay, 120000);
  assert.equal(pool.totalRebuys, 5);
});

test("computeCosts splits each cost among its own participants", () => {
  const result = computeCosts(costs, players);

  assert.equal(result.totalCents, 19000);
  assert.equal(result.participants, 8);
  assert.deepEqual(result.errors, []);
  assert.equal(result.rows[0].byPlayer.p1, 1250);
  assert.equal(result.rows[0].byPlayer.p7, 1250);
  assert.equal(result.rows[1].byPlayer.p1, 1500);
  assert.equal(result.rows[1].byPlayer.p6, 1500);
  assert.equal(result.rows[1].byPlayer.p7, undefined);
  assert.equal(result.byPlayer.p1, 2750);
  assert.equal(result.byPlayer.p7, 1250);
});

test("computeCosts uses largest remainder and keeps the split exact", () => {
  const result = computeCosts(
    [
      {
        id: "c1",
        label: "Salão",
        amountCents: 10000,
        creditorId: "p1",
        participantIds: ["p1", "p2", "p3"],
      },
    ],
    players
  );

  assert.deepEqual(result.rows[0].byPlayer, { p1: 3334, p2: 3333, p3: 3333 });
  assert.equal(
    Object.values(result.rows[0].byPlayer).reduce((sum, value) => sum + value, 0),
    10000
  );
});

test("computeCosts rejects a cost without participants or creditor", () => {
  const noParticipants = computeCosts(
    [{ ...costs[0], participantIds: [] }],
    players
  );
  assert.equal(noParticipants.errors[0].code, "COST_NO_PARTICIPANTS");

  const noCreditor = computeCosts([{ ...costs[0], creditorId: "" }], players);
  assert.equal(noCreditor.errors[0].code, "COST_NO_CREDITOR");

  const zeroAmount = computeCosts(
    [{ ...costs[0], amountCents: 0, participantIds: [] }],
    players
  );
  assert.deepEqual(zeroAmount.errors, []);
});

test("buildSettlement computes prizes, costs and the transfer plan", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
  });

  assert.equal(settlement.ok, true);
  assert.equal(settlement.isComplete, true);
  assert.deepEqual(settlement.errors, []);
  assert.equal(settlement.pool.poolCents, 47000);
  assert.equal(settlement.totals.costsCents, 19000);
  assert.equal(settlement.totals.prizesCents, 47000);
  assert.equal(settlement.totals.totalInvestedCents, 66000);
  assert.equal(settlement.totals.outstandingCents, 29750);
  assert.equal(settlement.totals.sumBalanceCents, 0);
  assert.equal(settlement.totals.sumOwedCents, 0);

  const maria = settlement.rows.find((row) => row.id === "p3");
  const joao = settlement.rows.find((row) => row.id === "p2");
  const ana = settlement.rows.find((row) => row.id === "p1");
  const bia = settlement.rows.find((row) => row.id === "p7");

  assert.equal(maria.prizeCents, 31300);
  assert.equal(maria.gameCents, 7000);
  assert.equal(maria.rateioCents, 2750);
  assert.equal(maria.balanceCents, 21550);

  assert.equal(joao.prizeCents, 15700);
  assert.equal(joao.balanceCents, 5950);

  assert.equal(ana.balanceCents, -2750);
  assert.equal(bia.rateioCents, 1250);
  assert.equal(bia.balanceCents, -5250);

  assert.equal(settlement.transfers.length, 7);
  assert.equal(
    settlement.transfers.reduce((sum, transfer) => sum + transfer.amountCents, 0),
    29750
  );

  const remaining = applyPlan(settlement.nodes, settlement.transfers);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildTransferPlan supports the cashier mode", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
  });

  const plan = buildTransferPlan(settlement, { mode: "caixa", holderId: "p1" });
  assert.ok(plan.length > 0);

  const remaining = applyPlan(settlement.nodes, plan);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("partial payments reduce the remaining plan", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    payments: [
      { id: "pay1", fromId: "p4", toId: "p3", amountCents: 5000, createdAt: 1 },
    ],
  });

  assert.equal(settlement.ok, true);
  assert.equal(settlement.totals.outstandingCents, 24750);
  assert.equal(settlement.totals.sumBalanceCents, 0);

  const pedro = settlement.nodes.find((node) => node.id === "p4");
  const maria = settlement.nodes.find((node) => node.id === "p3");

  assert.equal(pedro.balanceCents, -4750);
  assert.equal(maria.balanceCents, 16550);
  assert.ok(
    settlement.transfers.some(
      (transfer) => transfer.fromId === "p4" && transfer.amountCents === 4750
    )
  );

  const remaining = applyPlan(settlement.nodes, settlement.transfers);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("cash in hand marks the stakes as already paid to the holder", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    cash: { inHand: true, holderId: "p1" },
  });

  assert.equal(settlement.ok, true);
  assert.equal(settlement.totals.sumBalanceCents, 0);
  assert.equal(settlement.totals.outstandingCents, 47750);

  const ana = settlement.nodes.find((node) => node.id === "p1");
  const maria = settlement.nodes.find((node) => node.id === "p3");

  assert.equal(ana.balanceCents, -39750);
  assert.equal(maria.balanceCents, 28550);

  const plan = buildTransferPlan(settlement, { mode: "caixa", holderId: "p1" });
  const remaining = applyPlan(settlement.nodes, plan);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("cash in hand without a holder blocks the settlement", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    cash: { inHand: true, holderId: null },
  });

  assert.equal(settlement.ok, false);
  assert.ok(settlement.errors.some((error) => error.code === "CASH_NO_HOLDER"));
  assert.deepEqual(settlement.transfers, []);
});

test("external cost creditors receive directly", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs: [{ ...costs[1], creditorId: "x1" }, costs[0]],
    creditors: [{ id: "x1", name: "Seu Antônio" }],
    winners,
  });

  assert.equal(settlement.ok, true);
  assert.equal(settlement.totals.sumBalanceCents, 0);

  const outsider = settlement.nodes.find((node) => node.id === "x1");
  const rui = settlement.nodes.find((node) => node.id === "p6");

  assert.equal(outsider.balanceCents, 9000);
  assert.equal(outsider.kind, "external");
  assert.equal(rui.balanceCents, -6750);
  assert.ok(settlement.transfers.some((transfer) => transfer.toId === "x1"));
});

test("cost errors block the plan without creating transfers", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs: [{ ...costs[0], participantIds: [] }, costs[1]],
    creditors: [],
    winners,
  });

  assert.equal(settlement.ok, false);
  assert.ok(settlement.errors.some((error) => error.code === "COST_NO_PARTICIPANTS"));
  assert.deepEqual(settlement.transfers, []);
});

test("missing winners produce a warning and an incomplete preview", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners: [{ playerId: "p3", chips: 80000 }],
  });

  assert.equal(settlement.ok, true);
  assert.equal(settlement.isComplete, false);
  assert.ok(settlement.warnings.some((warning) => warning.code === "MISSING_WINNERS"));
  assert.equal(settlement.payouts.length, 1);
  assert.equal(settlement.payouts[0].prizeCents, 47000);
});

test("duplicate winners are blocked", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners: [
      { playerId: "p3", chips: 80000 },
      { playerId: "p3", chips: 40000 },
    ],
  });

  assert.equal(settlement.ok, false);
  assert.ok(settlement.errors.some((error) => error.code === "DUPLICATE_WINNER"));
});

test("winner chips cannot exceed chips in play", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners: [
      { playerId: "p3", chips: 130000 },
      { playerId: "p2", chips: 40000 },
    ],
  });

  assert.equal(settlement.ok, false);
  assert.ok(settlement.errors.some((error) => error.code === "WINNER_CHIPS_EXCEED_PLAY"));
  assert.deepEqual(settlement.payouts, []);
});

test("payments with unknown nodes block the settlement", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    payments: [{ id: "pay1", fromId: "p99", toId: "p3", amountCents: 1000 }],
  });

  assert.equal(settlement.ok, false);
  assert.ok(settlement.errors.some((error) => error.code === "PAYMENT_UNKNOWN_NODE"));
  assert.equal(settlement.totals.sumBalanceCents, 0);
});

test("a settlement without costs keeps the old numbers", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs: [],
    creditors: [],
    winners,
  });

  assert.equal(settlement.ok, true);
  assert.equal(settlement.totals.costsCents, 0);
  assert.equal(settlement.totals.prizesCents, 47000);
  assert.equal(settlement.totals.totalInvestedCents, 47000);
  assert.equal(settlement.totals.outstandingCents, 33000);

  const maria = settlement.rows.find((row) => row.id === "p3");
  const joao = settlement.rows.find((row) => row.id === "p2");

  assert.equal(maria.balanceCents, 24300);
  assert.equal(joao.balanceCents, 8700);
  assert.equal(settlement.totals.sumBalanceCents, 0);
});
