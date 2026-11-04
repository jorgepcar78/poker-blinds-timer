// src/domain/summary.js

import { formatBrl, formatBrlWhole, formatPerPerson } from "./money";

function nodeName(settlement, nodeId) {
  const node = settlement.nodes.find((item) => item.id === nodeId);
  return node?.name || "Alguém";
}

function isExternal(settlement, nodeId) {
  return settlement.nodes.find((item) => item.id === nodeId)?.kind === "external";
}

function transferLines(settlement, transfers) {
  return transfers.map((transfer) => {
    const suffix = isExternal(settlement, transfer.toId) ? " (fora do jogo)" : "";
    return `${nodeName(settlement, transfer.fromId)} → ${nodeName(settlement, transfer.toId)}${suffix} ${formatBrl(transfer.amountCents)}`;
  });
}

export function buildGroupSummary(settlement, session, transfers = settlement.transfers) {
  const lines = [];
  const costsCents = settlement.totals.costsCents;

  lines.push(`🎰 ${session.name || "Torneio"}`);
  lines.push("");
  lines.push(`Pote: ${formatBrl(settlement.totals.poolCents)} · Custos: ${formatBrl(costsCents)}`);

  settlement.costs.rows
    .filter((cost) => cost.amountCents > 0)
    .forEach((cost) => {
      const creditor = cost.creditorId
        ? ` — adiantado por ${nodeName(settlement, cost.creditorId)}`
        : " — sem credor";
      lines.push(
        `· ${cost.label} ${formatBrl(cost.amountCents)} · ${cost.participantIds.length} de ${session.players.length} · ${formatPerPerson(cost.amountCents, cost.participantIds.length)}${creditor}`
      );
    });

  const ranking = [...settlement.payouts].sort((a, b) => a.position - b.position);

  if (ranking.length) {
    lines.push("");
    ranking.forEach((payout) => {
      lines.push(
        `🏆 ${payout.position}º ${nodeName(settlement, payout.playerId)} — ${payout.chips.toLocaleString("pt-BR")} fichas — ${formatBrlWhole(payout.prizeCents)}`
      );
    });
  }

  lines.push("");

  if (!settlement.ok) {
    lines.push("⚠️ Acerto bloqueado:");
    settlement.errors.forEach((error) => lines.push(`· ${error.message}`));
  } else if (settlement.totals.outstandingCents === 0) {
    lines.push("✅ Tudo acertado.");
  } else if (transfers.length === 0) {
    lines.push("Os números fecham em R$ 0,00. Os pagamentos já foram registrados.");
  } else {
    lines.push("💸 ACERTO");
    transferLines(settlement, transfers).forEach((line) => lines.push(line));
    lines.push("");
    lines.push(`Falta acertar ${formatBrl(settlement.totals.outstandingCents)}.`);
  }

  lines.push("");
  lines.push(
    `Confere: prêmios ${formatBrl(settlement.totals.prizesCents)} + custos ${formatBrl(costsCents)} = ${formatBrl(settlement.totals.totalInvestedCents)} investidos`
  );

  return lines.join("\n");
}

export function buildPersonSummary(settlement, session, nodeId, transfers = settlement.transfers) {
  const node = settlement.nodes.find((item) => item.id === nodeId);
  if (!node) return "";

  const lines = [];
  const costShares = settlement.costs.rows.filter(
    (cost) => (cost.byPlayer[nodeId] ?? 0) > 0
  );

  lines.push(`🎰 Acerto — ${session.name || "Torneio"}`);
  lines.push("");
  lines.push(`${node.name}, seu resultado:`);
  lines.push("");

  if (node.breakdown.stakeCents > 0) {
    lines.push(`Jogo: ${formatBrl(node.breakdown.stakeCents)}`);
  }

  costShares.forEach((cost) => {
    lines.push(`${cost.label}: ${formatBrl(cost.byPlayer[nodeId])}`);
  });

  const invested = node.breakdown.stakeCents + node.breakdown.costsCents;
  lines.push(`Total investido: ${formatBrl(invested)}`);

  if (node.breakdown.prizeCents > 0) {
    lines.push(`Prêmio: ${formatBrlWhole(node.breakdown.prizeCents)}`);
  }

  if (node.breakdown.advancedCents > 0) {
    lines.push(`Adiantou: ${formatBrl(node.breakdown.advancedCents)}`);
  }

  lines.push("");

  if (node.balanceCents > 0) {
    lines.push(`A receber: ${formatBrl(node.balanceCents)}`);
  } else if (node.balanceCents < 0) {
    lines.push(`Falta pagar: ${formatBrl(-node.balanceCents)}`);
  } else {
    lines.push("Você está acertado.");
  }

  if (node.receivedCents > 0) {
    lines.push(`Já recebeu: ${formatBrl(node.receivedCents)}`);
  }

  if (node.sentCents > 0) {
    lines.push(`Já pagou: ${formatBrl(node.sentCents)}`);
  }

  const outgoing = transfers.filter((transfer) => transfer.fromId === nodeId);
  const incoming = transfers.filter((transfer) => transfer.toId === nodeId);

  if (outgoing.length) {
    lines.push("");
    lines.push("Pague para:");
    outgoing.forEach((transfer) => {
      lines.push(`· ${nodeName(settlement, transfer.toId)} — ${formatBrl(transfer.amountCents)}`);
    });
  }

  if (incoming.length) {
    lines.push("");
    lines.push("Recebe de:");
    incoming.forEach((transfer) => {
      lines.push(`· ${nodeName(settlement, transfer.fromId)} — ${formatBrl(transfer.amountCents)}`);
    });
  }

  return lines.join("\n");
}
