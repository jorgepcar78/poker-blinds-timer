import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSession,
  createSessionFromPrevious,
  SESSION_VERSION,
} from "../src/store/sessionStore.js";

function v1Session(overrides = {}) {
  return {
    version: 1,
    id: "s_test",
    name: "Torneio",
    players: [
      { id: "p1", name: "Ana", seat: 1, rebuys: 0, inRateio: true },
      { id: "p2", name: "João", seat: 2, rebuys: 1, inRateio: false },
      { id: "p3", name: "Maria", seat: 3, rebuys: 0, inRateio: true },
    ],
    config: {
      buyInCents: 4000,
      buyInChips: 10000,
      rebuyCents: 3000,
      rebuyChips: 8000,
      maxRebuys: 2,
      paidPlaces: 2,
      venueCents: 10000,
      snacksCents: 9000,
    },
    winners: [
      { playerId: "p3", chips: 20000, pix: ["  11999998888  ", "", "ana@example.com"] },
      { playerId: "p1", chips: 10000, pix: "ana@example.com" },
    ],
    ...overrides,
  };
}

test("normalizeSession migrates v1 costs and drops PIX keys", () => {
  const session = normalizeSession(v1Session());

  assert.equal(session.version, SESSION_VERSION);
  assert.equal(session.costs.length, 2);
  assert.equal(session.costs[0].label, "Salão");
  assert.equal(session.costs[0].amountCents, 10000);
  assert.equal(session.costs[0].creditorId, "");
  assert.deepEqual(session.costs[0].participantIds, ["p1", "p3"]);
  assert.equal(session.costs[1].label, "Snacks");
  assert.deepEqual(session.costs[1].participantIds, ["p1", "p3"]);

  assert.equal(session.winners[0].pix, undefined);
  assert.equal(session.winners[1].pix, undefined);
  assert.equal("inRateio" in session.players[0], false);
  assert.deepEqual(session.payments, []);
  assert.deepEqual(session.cash, { inHand: false, holderId: null });
  assert.deepEqual(session.creditors, []);
});

test("normalizeSession migrates only the costs that exist", () => {
  const onlyVenue = normalizeSession(
    v1Session({ config: { ...v1Session().config, snacksCents: 0 } })
  );
  assert.equal(onlyVenue.costs.length, 1);
  assert.equal(onlyVenue.costs[0].label, "Salão");

  const noCosts = normalizeSession(
    v1Session({ config: { ...v1Session().config, venueCents: 0, snacksCents: 0 } })
  );
  assert.deepEqual(noCosts.costs, []);
});

test("normalizeSession is idempotent", () => {
  const once = normalizeSession(v1Session());
  const twice = normalizeSession(once);

  assert.deepEqual(twice, once);
});

test("normalizeSession filters invalid cost references and payments", () => {
  const session = normalizeSession({
    version: 2,
    players: [
      { id: "p1", name: "Ana" },
      { id: "p2", name: "Bia" },
    ],
    creditors: [{ id: "x1", name: "Zé" }],
    costs: [
      {
        id: "c1",
        label: "Salão",
        amountCents: 1000,
        creditorId: "x2",
        participantIds: ["p1", "p9", "p1"],
      },
    ],
    payments: [
      { id: "pay1", fromId: "p1", toId: "p9", amountCents: 500 },
      { id: "pay2", fromId: "p1", toId: "x1", amountCents: 500, kind: "game", costId: "c1" },
      { id: "pay3", fromId: "p1", toId: "p1", amountCents: 500 },
    ],
    cash: { inHand: true, holderId: "p9" },
  });

  assert.deepEqual(session.costs[0].participantIds, ["p1"]);
  assert.equal(session.costs[0].creditorId, "");
  assert.equal(session.payments.length, 1);
  assert.equal(session.payments[0].id, "pay2");
  assert.equal(session.payments[0].kind, "game");
  assert.equal(session.payments[0].costId, "c1");
  assert.deepEqual(session.cash, { inHand: true, holderId: null });
});

test("normalizeSession keeps a valid external creditor", () => {
  const session = normalizeSession({
    version: 2,
    players: [{ id: "p1", name: "Ana" }],
    creditors: [{ id: "x1", name: "Seu Antônio" }],
    costs: [
      {
        id: "c1",
        label: "Salão",
        amountCents: 1000,
        creditorId: "x1",
        participantIds: ["p1"],
      },
    ],
  });

  assert.equal(session.costs[0].creditorId, "x1");
  assert.equal(session.creditors[0].name, "Seu Antônio");
});

test("createSessionFromPrevious remaps players and keeps the cost preset", () => {
  const previous = normalizeSession({
    version: 2,
    name: "Sexta",
    players: [
      { id: "p1", name: "Ana" },
      { id: "p2", name: "Bia" },
    ],
    creditors: [{ id: "x1", name: "Seu Antônio" }],
    costs: [
      {
        id: "c1",
        label: "Salão",
        amountCents: 10000,
        creditorId: "p1",
        participantIds: ["p1", "p2"],
      },
      {
        id: "c2",
        label: "Snacks",
        amountCents: 9000,
        creditorId: "x1",
        participantIds: ["p1"],
      },
    ],
    winners: [{ playerId: "p1", chips: 20000 }],
    payments: [{ id: "pay1", fromId: "p2", toId: "p1", amountCents: 1000 }],
    cash: { inHand: true, holderId: "p1" },
  });

  const next = createSessionFromPrevious(previous);

  assert.equal(next.name, "Sexta");
  assert.equal(next.players.length, 2);
  assert.notEqual(next.players[0].id, previous.players[0].id);
  assert.deepEqual(
    next.players.map((player) => player.name),
    ["Ana", "Bia"]
  );
  assert.deepEqual(next.costs[0].participantIds, next.players.map((player) => player.id));
  assert.equal(next.costs[0].creditorId, next.players[0].id);
  assert.equal(next.costs[0].amountCents, 10000);
  assert.equal(next.costs[1].creditorId, "x1");
  assert.deepEqual(next.costs[1].participantIds, [next.players[0].id]);
  assert.deepEqual(next.winners, []);
  assert.deepEqual(next.payments, []);
  assert.deepEqual(next.cash, { inHand: false, holderId: null });
  assert.equal(next.players[0].rebuys, 0);
  assert.equal(next.players[0].seat, null);
});

test("normalizeSession falls back to a default session for garbage", () => {
  const session = normalizeSession({ version: 1, players: "nope" });

  assert.equal(session.version, SESSION_VERSION);
  assert.deepEqual(session.players, []);
  assert.deepEqual(session.costs, []);
  assert.deepEqual(session.payments, []);
});
