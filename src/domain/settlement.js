// src/domain/settlement.js

function issue(code, message) {
  return { code, message };
}

function toCents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function toChips(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

export function splitEqual(totalCents, count) {
  const total = Math.round(Number(totalCents));
  if (!Number.isSafeInteger(total) || total < 0) return null;
  if (!Number.isInteger(count) || count <= 0) return null;

  const base = Math.floor(total / count);
  const residual = total - base * count;

  return Array.from({ length: count }, (_, index) => base + (index < residual ? 1 : 0));
}

export function allocateProportional(totalCents, weights) {
  const total = Math.round(Number(totalCents));
  if (!Number.isSafeInteger(total) || total < 0) return null;
  if (!Array.isArray(weights) || weights.length === 0) return null;

  const list = weights.map((weight) => Math.round(Number(weight)));
  if (list.some((weight) => !Number.isSafeInteger(weight) || weight < 0)) return null;

  const totalWeight = list.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return null;

  const base = [];
  const remainders = [];

  for (const weight of list) {
    const numerator = total * weight;
    if (!Number.isSafeInteger(numerator)) return null;

    base.push(Math.floor(numerator / totalWeight));
    remainders.push(numerator % totalWeight);
  }

  const residual = total - base.reduce((sum, value) => sum + value, 0);

  const order = list
    .map((_, index) => index)
    .sort((a, b) => {
      if (remainders[b] !== remainders[a]) return remainders[b] - remainders[a];
      if (list[b] !== list[a]) return list[b] - list[a];
      return a - b;
    });

  for (let index = 0; index < residual; index += 1) {
    base[order[index]] += 1;
  }

  return base;
}

// Prize money is rounded to whole reais. The largest-remainder rule keeps the
// sum exact; any leftover cents below R$ 1,00 go to the biggest stack.
export function allocateReais(totalCents, weights) {
  const total = Math.round(Number(totalCents));
  if (!Number.isSafeInteger(total) || total < 0) return null;
  if (!Array.isArray(weights) || weights.length === 0) return null;

  const list = weights.map((weight) => Math.round(Number(weight)));
  if (list.some((weight) => !Number.isSafeInteger(weight) || weight < 0)) return null;

  const totalWeight = list.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return null;

  const exact = [];

  for (const weight of list) {
    const numerator = total * weight;
    if (!Number.isSafeInteger(numerator)) return null;
    exact.push(numerator / totalWeight);
  }

  const base = exact.map((value) => Math.floor(value / 100));
  const remainders = exact.map((value, index) => value - base[index] * 100);
  const totalReais = Math.floor(total / 100);
  const residual = totalReais - base.reduce((sum, value) => sum + value, 0);

  const order = list
    .map((_, index) => index)
    .sort((a, b) => {
      if (remainders[b] !== remainders[a]) return remainders[b] - remainders[a];
      if (list[b] !== list[a]) return list[b] - list[a];
      return a - b;
    });

  for (let index = 0; index < residual; index += 1) {
    base[order[index]] += 1;
  }

  const result = base.map((value) => value * 100);
  const topIndex = list.indexOf(Math.max(...list));
  result[topIndex] += total - result.reduce((sum, value) => sum + value, 0);

  return result;
}

export function computePool(config, players) {
  const buyInCents = toCents(config?.buyInCents);
  const buyInChips = toChips(config?.buyInChips);
  const rebuyCents = toCents(config?.rebuyCents);
  const rebuyChips = toChips(config?.rebuyChips);

  const totalRebuys = players.reduce(
    (sum, player) => sum + Math.max(0, Math.round(Number(player.rebuys) || 0)),
    0
  );

  return {
    playerCount: players.length,
    totalRebuys,
    buyInCents,
    buyInChips,
    rebuyCents,
    rebuyChips,
    poolCents: players.length * buyInCents + totalRebuys * rebuyCents,
    chipsInPlay: players.length * buyInChips + totalRebuys * rebuyChips,
  };
}

export function computeCosts(costs, players) {
  const playerIds = new Set(players.map((player) => player.id));

  const rows = (Array.isArray(costs) ? costs : []).map((cost) => {
    const label = String(cost?.label ?? "Custo").trim().slice(0, 24) || "Custo";
    const amountCents = toCents(cost?.amountCents);
    const participantIds = Array.from(
      new Set(
        (Array.isArray(cost?.participantIds) ? cost.participantIds : []).filter((id) =>
          playerIds.has(id)
        )
      )
    );
    const creditorId = typeof cost?.creditorId === "string" ? cost.creditorId : "";

    let error = null;

    if (amountCents > 0 && participantIds.length === 0) {
      error = issue(
        "COST_NO_PARTICIPANTS",
        `"${label}" tem valor e ninguém marcado para dividir.`
      );
    } else if (amountCents > 0 && !creditorId) {
      error = issue("COST_NO_CREDITOR", `Informe quem adiantou "${label}".`);
    }

    const shares =
      amountCents > 0 && participantIds.length > 0
        ? splitEqual(amountCents, participantIds.length)
        : [];
    const byPlayer = {};

    participantIds.forEach((playerId, index) => {
      byPlayer[playerId] = shares[index] ?? 0;
    });

    return {
      id: typeof cost?.id === "string" ? cost.id : "",
      label,
      amountCents,
      participantIds,
      creditorId,
      byPlayer,
      error,
    };
  });

  const totalCents = rows.reduce((sum, row) => sum + row.amountCents, 0);
  const byPlayer = {};
  const participants = new Set();

  rows.forEach((row) => {
    Object.entries(row.byPlayer).forEach(([playerId, cents]) => {
      byPlayer[playerId] = (byPlayer[playerId] ?? 0) + cents;
      participants.add(playerId);
    });
  });

  return {
    rows,
    totalCents,
    byPlayer,
    participants: participants.size,
    errors: rows.map((row) => row.error).filter(Boolean),
  };
}

function directTransfers(nodes) {
  const debtors = nodes
    .filter((node) => node.balanceCents < 0)
    .sort((a, b) => a.balanceCents - b.balanceCents || a.id.localeCompare(b.id));
  const creditors = nodes
    .filter((node) => node.balanceCents > 0)
    .sort((a, b) => b.balanceCents - a.balanceCents || a.id.localeCompare(b.id));

  const left = debtors.map((node) => ({ id: node.id, amount: -node.balanceCents }));
  const right = creditors.map((node) => ({ id: node.id, amount: node.balanceCents }));
  const transfers = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < left.length && creditorIndex < right.length) {
    const amount = Math.min(left[debtorIndex].amount, right[creditorIndex].amount);

    if (amount > 0) {
      transfers.push({
        fromId: left[debtorIndex].id,
        toId: right[creditorIndex].id,
        amountCents: amount,
      });
    }

    left[debtorIndex].amount -= amount;
    right[creditorIndex].amount -= amount;

    if (left[debtorIndex].amount === 0) debtorIndex += 1;
    if (right[creditorIndex].amount === 0) creditorIndex += 1;
  }

  return transfers;
}

function cashierTransfers(nodes, holderId) {
  const holder = nodes.find((node) => node.id === holderId && node.kind === "player");
  if (!holder) return [];

  const transfers = [];

  nodes.forEach((node) => {
    if (node.id !== holderId && node.balanceCents < 0) {
      transfers.push({
        fromId: node.id,
        toId: holderId,
        amountCents: -node.balanceCents,
      });
    }
  });

  nodes.forEach((node) => {
    if (node.id !== holderId && node.balanceCents > 0) {
      transfers.push({
        fromId: holderId,
        toId: node.id,
        amountCents: node.balanceCents,
      });
    }
  });

  return transfers;
}

export function buildTransferPlan(settlement, { mode = "direct", holderId = null } = {}) {
  if (!settlement || settlement.ok === false || settlement.isComplete === false) return [];
  if (!Array.isArray(settlement.nodes)) return [];

  return mode === "caixa"
    ? cashierTransfers(settlement.nodes, holderId)
    : directTransfers(settlement.nodes);
}

function netOriginLines(lines) {
  const directed = new Map();

  lines.forEach((line) => {
    const key = `${line.fromId}|${line.toId}`;
    if (!directed.has(key)) {
      directed.set(key, { fromId: line.fromId, toId: line.toId, components: [] });
    }

    const entry = directed.get(key);
    const component = entry.components.find(
      (item) =>
        item.label === line.label &&
        item.kind === line.kind &&
        item.costId === line.costId
    );

    if (component) {
      component.amountCents += line.amountCents;
    } else {
      entry.components.push({
        label: line.label,
        kind: line.kind,
        costId: line.costId,
        amountCents: line.amountCents,
      });
    }
  });

  const netted = [];
  const seen = new Set();

  directed.forEach((entry, key) => {
    if (seen.has(key)) return;

    const reverseKey = `${entry.toId}|${entry.fromId}`;
    const reverse = directed.get(reverseKey);
    seen.add(key);
    seen.add(reverseKey);

    const forwardTotal = entry.components.reduce(
      (sum, item) => sum + item.amountCents,
      0
    );
    const reverseTotal = reverse
      ? reverse.components.reduce((sum, item) => sum + item.amountCents, 0)
      : 0;

    if (forwardTotal === reverseTotal) return;

    const forwardWins = forwardTotal > reverseTotal;
    const source = forwardWins ? entry : reverse;
    const opposite = forwardWins ? reverse : entry;

    netted.push({
      fromId: source.fromId,
      toId: source.toId,
      amountCents: Math.abs(forwardTotal - reverseTotal),
      components: source.components
        .map((item) => ({ ...item, sign: "+" }))
        .concat(
          opposite
            ? opposite.components.map((item) => ({ ...item, sign: "-" }))
            : []
        ),
    });
  });

  return netted;
}

export function buildOriginPlan(settlement) {
  const empty = {
    lines: [],
    groups: [],
    remainingCents: 0,
    checked: 0,
    error: null,
  };

  if (!settlement || settlement.ok === false || settlement.isComplete === false) {
    return empty;
  }

  const nodeById = new Map(settlement.nodes.map((node) => [node.id, node]));
  const winners = settlement.payouts.filter(
    (payout) =>
      payout.chips > 0 && payout.prizeCents > 0 && nodeById.has(payout.playerId)
  );

  if (winners.length === 0) return empty;

  const lines = [];

  // Game: the non-winners' stakes fund the winners in proportion to their
  // chips. A winner does not pay their own stake; the difference between the
  // prize and the stake is settled between the winners ("acerto entre
  // premiados"), which also absorbs the cent rounding of each split.
  const stakeOf = (winner) => nodeById.get(winner.playerId)?.breakdown.stakeCents || 0;
  const targetByWinner = new Map(
    winners.map((winner) => [
      winner.playerId,
      winner.prizeCents - stakeOf(winner),
    ])
  );
  const receivingWinners = winners.filter(
    (winner) => (targetByWinner.get(winner.playerId) || 0) > 0
  );

  if (
    settlement.cash?.inHand &&
    settlement.cash.holderId &&
    nodeById.has(settlement.cash.holderId)
  ) {
    const holderId = settlement.cash.holderId;

    winners.forEach((winner) => {
      if (winner.playerId === holderId) return;

      lines.push({
        fromId: holderId,
        toId: winner.playerId,
        amountCents: winner.prizeCents,
        kind: "game",
        costId: "",
        label: "Jogo",
      });
    });
  } else if (receivingWinners.length > 0) {
    const receipts = new Map(
      receivingWinners.map((winner) => [winner.playerId, 0])
    );
    let splitFailed = false;

    settlement.nodes
      .filter(
        (node) =>
          node.kind === "player" &&
          node.breakdown.stakeCents > 0 &&
          !winners.some((winner) => winner.playerId === node.id)
      )
      .forEach((node) => {
        const split = allocateProportional(
          node.breakdown.stakeCents,
          receivingWinners.map((winner) => winner.chips)
        );

        if (!split) {
          splitFailed = true;
          return;
        }

        receivingWinners.forEach((winner, index) => {
          const amountCents = split[index] || 0;
          if (amountCents <= 0) return;

          lines.push({
            fromId: node.id,
            toId: winner.playerId,
            amountCents,
            kind: "game",
            costId: "",
            label: "Jogo",
          });

          receipts.set(
            winner.playerId,
            (receipts.get(winner.playerId) || 0) + amountCents
          );
        });
      });

    if (splitFailed) {
      return {
        ...empty,
        error: {
          code: "GAME_SPLIT_OVERFLOW",
          message: "As fichas são grandes demais para calcular o jogo.",
        },
      };
    }

    const residuals = winners.map((winner) => ({
      id: winner.playerId,
      balanceCents:
        (targetByWinner.get(winner.playerId) || 0) -
        (receipts.get(winner.playerId) || 0),
    }));

    directTransfers(residuals).forEach((transfer) => {
      lines.push({
        fromId: transfer.fromId,
        toId: transfer.toId,
        amountCents: transfer.amountCents,
        kind: "game",
        costId: "",
        label: "Acerto entre premiados",
      });
    });
  }

  // Costs: each participant's share goes to whoever advanced the cost.
  settlement.costs.rows.forEach((cost) => {
    if (cost.amountCents <= 0 || !cost.creditorId || !nodeById.has(cost.creditorId)) {
      return;
    }

    cost.participantIds.forEach((participantId) => {
      const amountCents = cost.byPlayer[participantId] || 0;
      if (amountCents <= 0 || participantId === cost.creditorId) return;

      lines.push({
        fromId: participantId,
        toId: cost.creditorId,
        amountCents,
        kind: "cost",
        costId: cost.id,
        label: cost.label,
      });
    });
  });

  // Pair-wise netting: when the same two people owe each other, show one line
  // with the composition instead of a round-trip.
  const netted = netOriginLines(lines);

  const payments = Array.isArray(settlement.payments) ? settlement.payments : [];
  const paidByPair = new Map();

  payments.forEach((payment) => {
    const pair = `${payment.fromId}|${payment.toId}`;
    paidByPair.set(pair, (paidByPair.get(pair) || 0) + payment.amountCents);
  });

  const handledPairs = new Set();
  netted.forEach((line) => {
    handledPairs.add(`${line.fromId}|${line.toId}`);
    handledPairs.add(`${line.toId}|${line.fromId}`);
  });

  // Payments without a matching pair obligation are refunds: whoever received
  // the money must return it, so the pair closes again.
  const refunds = [];
  const seenPaymentPairs = new Set();

  payments.forEach((payment) => {
    const forwardKey = `${payment.fromId}|${payment.toId}`;
    const reverseKey = `${payment.toId}|${payment.fromId}`;
    const canonical = [payment.fromId, payment.toId].sort().join("|");

    if (seenPaymentPairs.has(canonical)) return;
    seenPaymentPairs.add(canonical);

    if (handledPairs.has(forwardKey)) return;

    const forward = paidByPair.get(forwardKey) || 0;
    const reverse = paidByPair.get(reverseKey) || 0;
    const net = forward - reverse;

    if (net === 0) return;

    const amountCents = Math.abs(net);

    refunds.push({
      fromId: net > 0 ? payment.toId : payment.fromId,
      toId: net > 0 ? payment.fromId : payment.toId,
      amountCents,
      components: [
        {
          label: "Devolução",
          sign: "+",
          amountCents,
          kind: "refund",
          costId: "",
        },
      ],
    });
  });

  const entries = [];

  netted.forEach((line, index) => {
    const forwardPaid = paidByPair.get(`${line.fromId}|${line.toId}`) || 0;
    const reversePaid = paidByPair.get(`${line.toId}|${line.fromId}`) || 0;
    const netPaid = forwardPaid - reversePaid;
    const remaining = line.amountCents - netPaid;

    if (remaining < 0) {
      const refund = -remaining;

      entries.push({
        fromId: line.toId,
        toId: line.fromId,
        amountCents: refund,
        paidCents: 0,
        remainingCents: refund,
        components: [
          {
            label: "Devolução",
            sign: "+",
            amountCents: refund,
            kind: "refund",
            costId: "",
          },
        ],
        index,
      });
      return;
    }

    if (remaining === 0) {
      entries.push({
        ...line,
        index,
        paidCents: line.amountCents,
        remainingCents: 0,
      });
      return;
    }

    if (netPaid < 0) {
      const overpaid = -netPaid;

      entries.push({
        ...line,
        amountCents: line.amountCents + overpaid,
        paidCents: 0,
        remainingCents: line.amountCents + overpaid,
        components: line.components.concat([
          {
            label: "Pagamento a mais",
            sign: "+",
            amountCents: overpaid,
            kind: "payment",
            costId: "",
          },
        ]),
        index,
      });
      return;
    }

    entries.push({
      ...line,
      index,
      paidCents: netPaid,
      remainingCents: remaining,
    });
  });

  refunds.forEach((line, index) => {
    entries.push({
      ...line,
      index: netted.length + index,
      paidCents: 0,
      remainingCents: line.amountCents,
    });
  });

  const groups = [];
  const groupByPerson = new Map();

  const ensureGroup = (nodeId) => {
    if (!groupByPerson.has(nodeId)) {
      const node = nodeById.get(nodeId);
      const group = {
        id: nodeId,
        name: node?.name || "Alguém",
        outgoing: [],
        incoming: [],
        remainingCents: 0,
        incomingRemainingCents: 0,
        balanceCents: node?.balanceCents || 0,
      };

      groupByPerson.set(nodeId, group);
      groups.push(group);
    }

    return groupByPerson.get(nodeId);
  };

  entries.forEach((entry) => {
    const payer = ensureGroup(entry.fromId);
    payer.outgoing.push(entry);
    payer.remainingCents += entry.remainingCents;

    const receiver = ensureGroup(entry.toId);
    receiver.incoming.push(entry);
    receiver.incomingRemainingCents += entry.remainingCents;
  });

  groups.forEach((group) => {
    group.outgoing.sort((a, b) => a.index - b.index);
    group.incoming.sort((a, b) => a.index - b.index);
  });

  const nodeOrder = new Map(
    settlement.nodes.map((node, index) => [node.id, index])
  );
  groups.sort(
    (a, b) =>
      (nodeOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (nodeOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );

  return {
    lines: entries,
    groups,
    remainingCents: entries.reduce((sum, entry) => sum + entry.remainingCents, 0),
    checked: entries.filter((entry) => entry.remainingCents === 0).length,
    error: null,
  };
}

export function buildSettlement({
  config,
  players = [],
  costs = [],
  creditors = [],
  winners = [],
  payments = [],
  cash = null,
}) {
  const errors = [];
  const warnings = [];
  const pool = computePool(config, players);
  const costSummary = computeCosts(costs, players);
  costSummary.errors.forEach((error) => errors.push(error));

  const paidPlaces = Math.round(Number(config?.paidPlaces) || 0);

  if (players.length < 2) {
    errors.push(issue("NOT_ENOUGH_PLAYERS", "Cadastre pelo menos dois jogadores."));
  }

  if (paidPlaces < 1) {
    errors.push(issue("INVALID_PAID_PLACES", "O número de premiados deve ser pelo menos 1."));
  } else if (players.length > 0 && paidPlaces > players.length) {
    errors.push(
      issue("TOO_MANY_PAID_PLACES", "O número de premiados não pode ser maior que o de jogadores.")
    );
  }

  const maxRebuys = Math.max(0, Math.round(Number(config?.maxRebuys) || 0));

  players.forEach((player) => {
    const rebuys = Number(player.rebuys) || 0;

    if (!Number.isInteger(rebuys) || rebuys < 0 || rebuys > maxRebuys) {
      errors.push(
        issue(
          "INVALID_REBUY_COUNT",
          `${player.name || "Jogador"} tem ${rebuys} ${rebuys === 1 ? "rebuy" : "rebuys"}, fora do limite de ${maxRebuys}.`
        )
      );
    }
  });

  const playerIds = new Set(players.map((player) => player.id));
  const entered = winners
    .slice(0, Math.max(paidPlaces, 0))
    .filter((winner) => winner && winner.playerId && playerIds.has(winner.playerId))
    .map((winner) => ({
      playerId: winner.playerId,
      chips: Number(winner.chips),
    }));

  const validWinners = [];
  const seenWinners = new Set();

  entered.forEach((winner) => {
    if (!Number.isInteger(winner.chips) || winner.chips <= 0) return;

    if (seenWinners.has(winner.playerId)) {
      errors.push(issue("DUPLICATE_WINNER", "O mesmo jogador foi informado mais de uma vez."));
      return;
    }

    seenWinners.add(winner.playerId);
    validWinners.push(winner);
  });

  if (validWinners.length < paidPlaces) {
    warnings.push(
      issue("MISSING_WINNERS", `Preencha as fichas dos ${paidPlaces} premiados para fechar o acerto.`)
    );
  }

  const winnerChips = validWinners.reduce((sum, winner) => sum + winner.chips, 0);

  if (winnerChips > pool.chipsInPlay) {
    errors.push(
      issue(
        "WINNER_CHIPS_EXCEED_PLAY",
        "A soma das fichas dos premiados é maior que o total de fichas em jogo. Confira os rebuys."
      )
    );
  }

  const nodes = [
    ...players.map((player) => ({
      id: player.id,
      name: player.name || "Sem nome",
      kind: "player",
    })),
    ...creditors.map((creditor) => ({
      id: creditor.id,
      name: creditor.name || "Sem nome",
      kind: "external",
    })),
  ];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  costSummary.rows.forEach((row) => {
    if (row.amountCents > 0 && row.creditorId && !nodeById.has(row.creditorId)) {
      errors.push(issue("COST_CREDITOR_UNKNOWN", `O credor de "${row.label}" não está no acerto.`));
    }
  });

  let payouts = [];
  const prizeById = {};
  const prizeBlocked = errors.some(
    (error) =>
      error.code === "WINNER_CHIPS_EXCEED_PLAY" || error.code === "DUPLICATE_WINNER"
  );

  if (validWinners.length > 0 && !prizeBlocked) {
    const prizes = allocateReais(
      pool.poolCents,
      validWinners.map((winner) => winner.chips)
    );

    if (!prizes) {
      errors.push(
        issue("PRIZE_OVERFLOW", "Não foi possível calcular os prêmios com esses valores.")
      );
    } else {
      const sorted = validWinners
        .map((winner, index) => ({
          ...winner,
          prizeCents: prizes[index],
          slot: index,
        }))
        .sort((a, b) => b.chips - a.chips || a.slot - b.slot);

      payouts = sorted.map((winner, index) => ({
        playerId: winner.playerId,
        chips: winner.chips,
        prizeCents: winner.prizeCents,
        position: index + 1,
      }));

      payouts.forEach((payout) => {
        prizeById[payout.playerId] = payout.prizeCents;
      });
    }
  }

  const advanceBy = {};
  costSummary.rows.forEach((row) => {
    if (row.amountCents > 0 && row.creditorId && nodeById.has(row.creditorId)) {
      advanceBy[row.creditorId] = (advanceBy[row.creditorId] ?? 0) + row.amountCents;
    }
  });

  const stakeById = {};
  players.forEach((player) => {
    const rebuys = Math.max(0, Math.round(Number(player.rebuys) || 0));
    stakeById[player.id] = pool.buyInCents + rebuys * pool.rebuyCents;
  });

  const owedCents = {};
  nodes.forEach((node) => {
    owedCents[node.id] = 0;
  });

  players.forEach((player) => {
    owedCents[player.id] =
      (prizeById[player.id] ?? 0) -
      (stakeById[player.id] ?? 0) -
      (costSummary.byPlayer[player.id] ?? 0) +
      (advanceBy[player.id] ?? 0);
  });

  creditors.forEach((creditor) => {
    owedCents[creditor.id] = advanceBy[creditor.id] ?? 0;
  });

  const sentCents = {};
  const receivedCents = {};
  nodes.forEach((node) => {
    sentCents[node.id] = 0;
    receivedCents[node.id] = 0;
  });

  const normalizedPayments = [];

  (Array.isArray(payments) ? payments : []).forEach((payment) => {
    const amountCents = toCents(payment?.amountCents);

    if (amountCents <= 0 || payment?.fromId === payment?.toId) {
      errors.push(issue("INVALID_PAYMENT", "Um pagamento registrado está inválido."));
      return;
    }

    if (!nodeById.has(payment?.fromId) || !nodeById.has(payment?.toId)) {
      errors.push(
        issue(
          "PAYMENT_UNKNOWN_NODE",
          "Um pagamento registrado aponta para alguém fora do acerto."
        )
      );
      return;
    }

    sentCents[payment.fromId] += amountCents;
    receivedCents[payment.toId] += amountCents;
    normalizedPayments.push({
      id: typeof payment.id === "string" ? payment.id : "",
      fromId: payment.fromId,
      toId: payment.toId,
      amountCents,
      note: String(payment.note ?? "").slice(0, 80),
      kind:
        payment.kind === "game" || payment.kind === "cost" || payment.kind === "other"
          ? payment.kind
          : "",
      costId: typeof payment.costId === "string" ? payment.costId.slice(0, 64) : "",
      createdAt: Number(payment.createdAt) || 0,
    });
  });

  const cashInHand = Boolean(cash?.inHand);
  const holderId =
    cashInHand && cash?.holderId && nodeById.get(cash.holderId)?.kind === "player"
      ? cash.holderId
      : null;

  if (cashInHand && !holderId) {
    errors.push(issue("CASH_NO_HOLDER", "Escolha quem está com o dinheiro do buy-in."));
  }

  if (cashInHand && holderId) {
    players.forEach((player) => {
      const stake = stakeById[player.id] ?? 0;
      sentCents[player.id] += stake;
      receivedCents[holderId] += stake;
    });
  }

  const ledgerNodes = nodes.map((node) => {
    const balanceCents =
      (owedCents[node.id] ?? 0) + (sentCents[node.id] ?? 0) - (receivedCents[node.id] ?? 0);

    return {
      ...node,
      owedCents: owedCents[node.id] ?? 0,
      sentCents: sentCents[node.id] ?? 0,
      receivedCents: receivedCents[node.id] ?? 0,
      balanceCents,
      breakdown: {
        stakeCents: stakeById[node.id] ?? 0,
        costsCents: costSummary.byPlayer[node.id] ?? 0,
        prizeCents: prizeById[node.id] ?? 0,
        advancedCents: advanceBy[node.id] ?? 0,
      },
    };
  });

  const rows = players.map((player) => {
    const playerRebuys = Math.max(0, Math.round(Number(player.rebuys) || 0));
    const costShares = costSummary.rows
      .filter((row) => (row.byPlayer[player.id] ?? 0) > 0)
      .map((row) => ({
        costId: row.id,
        label: row.label,
        cents: row.byPlayer[player.id],
      }));
    const rateioCents = costShares.reduce((sum, share) => sum + share.cents, 0);
    const gameCents = pool.buyInCents + playerRebuys * pool.rebuyCents;
    const prizeCents = prizeById[player.id] ?? 0;
    const payout = payouts.find((item) => item.playerId === player.id);
    const ledgerNode = ledgerNodes.find((node) => node.id === player.id);

    return {
      ...player,
      gameCents,
      rateioCents,
      costShares,
      totalInvestedCents: gameCents + rateioCents,
      prizeCents,
      balanceCents: ledgerNode.balanceCents,
      sentCents: ledgerNode.sentCents,
      receivedCents: ledgerNode.receivedCents,
      position: payout?.position ?? null,
    };
  });

  const prizesCents = payouts.reduce((sum, payout) => sum + payout.prizeCents, 0);
  const balanceCents = ledgerNodes.reduce((sum, node) => sum + node.balanceCents, 0);

  const settlement = {
    isComplete: errors.length === 0 && validWinners.length === paidPlaces,
    ok: errors.length === 0,
    errors,
    warnings,
    pool,
    costs: costSummary,
    payouts,
    paidPlaces,
    nodes: ledgerNodes,
    receivables: ledgerNodes
      .filter((node) => node.balanceCents > 0)
      .sort((a, b) => b.balanceCents - a.balanceCents || a.name.localeCompare(b.name)),
    payments: normalizedPayments,
    cash: { inHand: cashInHand, holderId },
    rows,
    totals: {
      poolCents: pool.poolCents,
      prizesCents,
      costsCents: costSummary.totalCents,
      totalInvestedCents: pool.poolCents + costSummary.totalCents,
      sumOwedCents: ledgerNodes.reduce((sum, node) => sum + node.owedCents, 0),
      sumBalanceCents: balanceCents,
      outstandingCents: ledgerNodes
        .filter((node) => node.balanceCents < 0)
        .reduce((sum, node) => sum - node.balanceCents, 0),
    },
  };

  settlement.transfers = buildTransferPlan(settlement);

  return settlement;
}
