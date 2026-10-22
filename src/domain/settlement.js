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

export function computeRateio(config, players) {
  const venueCents = toCents(config?.venueCents);
  const snacksCents = toCents(config?.snacksCents);
  const totalCents = venueCents + snacksCents;
  const participants = players.filter((player) => player.inRateio);

  if (totalCents > 0 && participants.length === 0) {
    return {
      totalCents,
      venueCents,
      snacksCents,
      participants: 0,
      byPlayer: {},
      error: issue(
        "NO_RATEIO_PARTICIPANTS",
        "Há custos de salão/lanche, mas nenhum jogador participa do rateio."
      ),
    };
  }

  const shares = totalCents > 0 ? splitEqual(totalCents, participants.length) : [];
  const byPlayer = {};

  participants.forEach((player, index) => {
    byPlayer[player.id] = shares[index] ?? 0;
  });

  return {
    totalCents,
    venueCents,
    snacksCents,
    participants: participants.length,
    byPlayer,
    error: null,
  };
}

export function buildSettlement({ config, players = [], winners = [] }) {
  const errors = [];
  const warnings = [];
  const pool = computePool(config, players);
  const rateio = computeRateio(config, players);

  if (rateio.error) errors.push(rateio.error);

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

  const entered = winners
    .filter((winner) => winner && winner.playerId)
    .map((winner) => ({
      playerId: winner.playerId,
      chips: Number(winner.chips),
    }));

  const validWinners = entered.filter(
    (winner) => Number.isInteger(winner.chips) && winner.chips > 0
  );

  if (entered.length > paidPlaces) {
    errors.push(
      issue("TOO_MANY_WINNERS", "Há mais premiados preenchidos do que o número configurado.")
    );
  }

  if (validWinners.length < paidPlaces) {
    warnings.push(
      issue(
        "MISSING_WINNERS",
        `Preencha as fichas dos ${paidPlaces} premiados para fechar o acerto.`
      )
    );
  }

  const uniquePlayers = new Set();
  validWinners.forEach((winner) => {
    const player = players.find((item) => item.id === winner.playerId);

    if (!player) {
      errors.push(issue("WINNER_NOT_IN_ROSTER", "Um dos premiados não está na lista de jogadores."));
      return;
    }

    if (uniquePlayers.has(winner.playerId)) {
      errors.push(issue("DUPLICATE_WINNER", "O mesmo jogador foi informado mais de uma vez."));
    }
    uniquePlayers.add(winner.playerId);
  });

  const winnerChips = validWinners.reduce((sum, winner) => sum + winner.chips, 0);

  if (winnerChips > pool.chipsInPlay) {
    errors.push(
      issue(
        "WINNER_CHIPS_EXCEED_PLAY",
        "A soma das fichas dos premiados é maior que o total de fichas em jogo. Confira os rebuys."
      )
    );
  }

  let payouts = [];
  const prizeById = {};

  if (errors.length === 0 && validWinners.length > 0) {
    const prizes = allocateProportional(
      pool.poolCents,
      validWinners.map((winner) => winner.chips)
    );

    if (prizes) {
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

  const rows = players.map((player) => {
    const playerRebuys = Math.max(0, Math.round(Number(player.rebuys) || 0));
    const gameCents = pool.buyInCents + playerRebuys * pool.rebuyCents;
    const rateioCents = rateio.byPlayer[player.id] ?? 0;
    const totalInvestedCents = gameCents + rateioCents;
    const prizeCents = prizeById[player.id] ?? 0;
    const payout = payouts.find((item) => item.playerId === player.id);

    return {
      ...player,
      gameCents,
      rateioCents,
      totalInvestedCents,
      prizeCents,
      balanceCents: prizeCents - totalInvestedCents,
      position: payout?.position ?? null,
    };
  });

  const totals = {
    poolCents: pool.poolCents,
    costsCents: rateio.totalCents,
    prizesCents: payouts.reduce((sum, payout) => sum + payout.prizeCents, 0),
    totalInvestedCents: rows.reduce((sum, row) => sum + row.totalInvestedCents, 0),
    balanceCents: rows.reduce((sum, row) => sum + row.balanceCents, 0),
    cashDifferenceCents:
      rows.reduce((sum, row) => sum + row.totalInvestedCents, 0) -
      payouts.reduce((sum, payout) => sum + payout.prizeCents, 0) -
      rateio.totalCents,
  };

  return {
    isComplete: errors.length === 0 && validWinners.length === paidPlaces,
    ok: errors.length === 0,
    errors,
    warnings,
    pool,
    rateio,
    payouts,
    rows,
    totals,
    paidPlaces,
  };
}
