import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateProportional,
  allocateReais,
  splitEqual,
  computePool,
  computeCosts,
  buildSettlement,
  buildTransferPlan,
  buildOriginPlan,
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

function applyRemaining(nodes, plan) {
  const balances = new Map(nodes.map((node) => [node.id, node.balanceCents]));

  plan.forEach((transfer) => {
    balances.set(
      transfer.fromId,
      balances.get(transfer.fromId) + transfer.remainingCents
    );
    balances.set(
      transfer.toId,
      balances.get(transfer.toId) - transfer.remainingCents
    );
  });

  return balances;
}

test("splitEqual distributes the remainder in cents", () => {
  assert.deepEqual(splitEqual(18000, 7), [2572, 2572, 2572, 2571, 2571, 2571, 2571]);
  assert.equal(splitEqual(18000, 7).reduce((sum, value) => sum + value, 0), 18000);
  assert.deepEqual(splitEqual(10000, 3), [3334, 3333, 3333]);
});

test("allocateProportional splits cents by weight and keeps the total", () => {
  assert.deepEqual(allocateProportional(47000, [80000, 40000]), [31333, 15667]);
  assert.deepEqual(allocateProportional(50000, [40000, 40000, 40000]), [16667, 16667, 16666]);
  assert.deepEqual(allocateProportional(100, [1, 1, 1]), [34, 33, 33]);
  assert.equal(
    allocateProportional(47000, [80000, 40000]).reduce((sum, value) => sum + value, 0),
    47000
  );
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

test("buildOriginPlan nets each pair and zeroes the ledger", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
  });
  const origin = buildOriginPlan(settlement);

  assert.ok(origin.lines.length > 0);
  assert.equal(origin.groups.length, 8);

  const anaToMaria = origin.lines.find(
    (line) => line.fromId === "p1" && line.toId === "p3"
  );
  assert.equal(anaToMaria.amountCents, 5417);
  assert.deepEqual(
    anaToMaria.components.map((component) => [
      component.label,
      component.sign,
      component.amountCents,
    ]),
    [
      ["Jogo", "+", 6667],
      ["Salão", "-", 1250],
    ]
  );

  const ruiToMaria = origin.lines.find(
    (line) => line.fromId === "p6" && line.toId === "p3"
  );
  assert.equal(ruiToMaria.amountCents, 1167);
  assert.deepEqual(
    ruiToMaria.components.map((component) => [
      component.label,
      component.amountCents,
    ]),
    [
      ["Jogo", 2667],
      ["Snacks", 1500],
    ]
  );

  const anaGroup = origin.groups.find((group) => group.id === "p1");
  assert.equal(anaGroup.remainingCents, 7750);
  assert.equal(anaGroup.incomingRemainingCents, 5000);
  assert.equal(anaGroup.balanceCents, -2750);

  const cross = origin.lines.find(
    (line) => line.fromId === "p2" && line.toId === "p3"
  );
  assert.equal(cross.amountCents, 2298);
  assert.equal(cross.components[0].label, "Acerto entre premiados");

  const remaining = applyPlan(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan sends the prizes from the cash holder when the pot is in hand", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    cash: { inHand: true, holderId: "p1" },
  });
  const origin = buildOriginPlan(settlement);

  const toMaria = origin.lines.find(
    (line) => line.fromId === "p1" && line.toId === "p3"
  );
  const toJoao = origin.lines.find(
    (line) => line.fromId === "p1" && line.toId === "p2"
  );

  assert.equal(toMaria.amountCents, 30050);
  assert.equal(toJoao.amountCents, 14450);
  assert.ok(!origin.lines.some((line) => line.fromId === "p4" && line.toId === "p3"));

  const remaining = applyPlan(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan marks payments by payer and receiver pair", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    payments: [
      {
        id: "pay1",
        fromId: "p1",
        toId: "p3",
        amountCents: 5000,
        kind: "game",
        costId: "",
        createdAt: 1,
      },
      {
        id: "pay2",
        fromId: "p1",
        toId: "p2",
        amountCents: 1000,
        createdAt: 2,
      },
    ],
  });
  const origin = buildOriginPlan(settlement);

  const p1p3 = origin.lines.find(
    (line) => line.fromId === "p1" && line.toId === "p3"
  );
  assert.equal(p1p3.amountCents, 5417);
  assert.equal(p1p3.paidCents, 5000);
  assert.equal(p1p3.remainingCents, 417);

  const p1p2 = origin.lines.find(
    (line) => line.fromId === "p1" && line.toId === "p2"
  );
  assert.equal(p1p2.amountCents, 2083);
  assert.equal(p1p2.paidCents, 1000);
  assert.equal(p1p2.remainingCents, 1083);

  const remaining = applyRemaining(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan turns a reverse payment into more debt", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    payments: [
      {
        id: "pay1",
        fromId: "p3",
        toId: "p1",
        amountCents: 1000,
        createdAt: 1,
      },
    ],
  });
  const origin = buildOriginPlan(settlement);

  const line = origin.lines.find(
    (item) => item.fromId === "p1" && item.toId === "p3"
  );
  assert.equal(line.amountCents, 6417);
  assert.equal(line.paidCents, 0);
  assert.equal(line.remainingCents, 6417);
  assert.ok(
    line.components.some(
      (component) =>
        component.label === "Pagamento a mais" && component.amountCents === 1000
    )
  );

  const remaining = applyRemaining(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan turns an overpayment into a refund line", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    payments: [
      {
        id: "pay1",
        fromId: "p1",
        toId: "p3",
        amountCents: 6000,
        createdAt: 1,
      },
    ],
  });
  const origin = buildOriginPlan(settlement);

  assert.ok(
    !origin.lines.some((line) => line.fromId === "p1" && line.toId === "p3")
  );

  const refund = origin.lines.find(
    (line) => line.fromId === "p3" && line.toId === "p1"
  );
  assert.equal(refund.amountCents, 583);
  assert.equal(refund.remainingCents, 583);
  assert.equal(refund.components[0].label, "Devolução");

  const remaining = applyRemaining(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan creates a refund for a payment with no obligation", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners,
    payments: [
      {
        id: "pay1",
        fromId: "p4",
        toId: "p5",
        amountCents: 500,
        createdAt: 1,
      },
    ],
  });
  const origin = buildOriginPlan(settlement);

  const refund = origin.lines.find(
    (line) => line.fromId === "p5" && line.toId === "p4"
  );
  assert.equal(refund.amountCents, 500);
  assert.equal(refund.components[0].label, "Devolução");

  const remaining = applyRemaining(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan drops a pair whose obligations cancel out", () => {
  const settlement = buildSettlement({
    config: {
      buyInCents: 2500,
      buyInChips: 1000,
      rebuyCents: 0,
      rebuyChips: 0,
      maxRebuys: 0,
      paidPlaces: 1,
    },
    players: [
      { id: "p1", name: "Ana", rebuys: 0 },
      { id: "p2", name: "Bia", rebuys: 0 },
    ],
    costs: [
      {
        id: "c1",
        label: "Salão",
        amountCents: 5000,
        creditorId: "p2",
        participantIds: ["p1", "p2"],
      },
    ],
    creditors: [],
    winners: [{ playerId: "p1", chips: 1000 }],
  });
  const origin = buildOriginPlan(settlement);

  assert.deepEqual(origin.lines, []);
  assert.deepEqual(origin.groups, []);
  assert.equal(settlement.totals.sumBalanceCents, 0);
});

test("buildOriginPlan handles a winner whose prize is smaller than the stake", () => {
  const settlement = buildSettlement({
    config: {
      buyInCents: 10000,
      buyInChips: 20000,
      rebuyCents: 0,
      rebuyChips: 0,
      maxRebuys: 0,
      paidPlaces: 2,
    },
    players: [
      { id: "p1", name: "Ana", rebuys: 0 },
      { id: "p2", name: "Bia", rebuys: 0 },
    ],
    costs: [],
    creditors: [],
    winners: [
      { playerId: "p1", chips: 30000 },
      { playerId: "p2", chips: 10000 },
    ],
  });
  const origin = buildOriginPlan(settlement);

  const cross = origin.lines.find(
    (line) => line.fromId === "p2" && line.toId === "p1"
  );
  assert.equal(cross.amountCents, 5000);

  const remaining = applyRemaining(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan sends cost shares to an external creditor", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs: [{ ...costs[1], creditorId: "x1" }, costs[0]],
    creditors: [{ id: "x1", name: "Seu Antônio" }],
    winners,
  });
  const origin = buildOriginPlan(settlement);
  const lines = origin.lines.filter((line) => line.toId === "x1");

  assert.equal(lines.length, 6);
  assert.ok(lines.every((line) => line.amountCents === 1500));

  const remaining = applyPlan(settlement.nodes, origin.lines);
  remaining.forEach((balance) => assert.equal(balance, 0));
});

test("buildOriginPlan stays empty until the settlement is complete", () => {
  const settlement = buildSettlement({
    config,
    players,
    costs,
    creditors: [],
    winners: [{ playerId: "p3", chips: 80000 }],
  });
  const origin = buildOriginPlan(settlement);

  assert.deepEqual(origin.lines, []);
  assert.deepEqual(origin.groups, []);
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
