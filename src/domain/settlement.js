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
