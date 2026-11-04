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

function lineComponents(line) {
  return line.components
    .map((component, index) => {
      if (index === 0) {
        return `${component.label} ${formatBrl(component.amountCents)}`;
      }

      return `${component.sign === "-" ? "−" : "+"} ${component.label} ${formatBrl(component.amountCents)}`;
    })
    .join(" ");
}

function summaryBase(settlement, session) {
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
  return lines;
}

function summaryFooter(settlement) {
  return [
    "",
    `Confere: prêmios ${formatBrl(settlement.totals.prizesCents)} + custos ${formatBrl(settlement.totals.costsCents)} = ${formatBrl(settlement.totals.totalInvestedCents)} investidos`,
  ];
}

function pushErrors(lines, settlement) {
  lines.push("⚠️ Acerto bloqueado:");
  settlement.errors.forEach((error) => lines.push(`· ${error.message}`));
}

export function buildGroupSummary(settlement, session, transfers = settlement.transfers) {
  const lines = summaryBase(settlement, session);

  if (!settlement.ok) {
    pushErrors(lines, settlement);
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

  lines.push(...summaryFooter(settlement));
  return lines.join("\n");
}

export function buildOriginSummary(settlement, session, originPlan) {
  const lines = summaryBase(settlement, session);
  const groups = originPlan?.groups || [];

  if (!settlement.ok) {
    pushErrors(lines, settlement);
  } else if (originPlan?.error) {
    lines.push("⚠️ Não foi possível calcular o acerto por origem.");
    lines.push(originPlan.error.message);
  } else if (groups.length === 0) {
    lines.push("✅ Tudo acertado.");
  } else {
    lines.push("💸 ACERTO POR ORIGEM");
    lines.push("Cada valor vai para quem é devido, com compensação entre o mesmo par.");
    lines.push("");

    groups.forEach((group) => {
      const external = isExternal(settlement, group.id) ? " (fora do jogo)" : "";
      lines.push(
        `${group.name}${external} — paga ${formatBrl(group.remainingCents)} · recebe ${formatBrl(group.incomingRemainingCents)}`
      );

      group.outgoing.forEach((line) => {
        const mark =
          line.remainingCents === 0
            ? " (conferido)"
            : line.paidCents > 0
              ? ` (falta ${formatBrl(line.remainingCents)})`
              : "";
        lines.push(
          `  → ${nodeName(settlement, line.toId)} ${formatBrl(line.amountCents)}${mark} — ${lineComponents(line)}`
        );
      });

      group.incoming.forEach((line) => {
        const mark =
          line.remainingCents === 0
            ? " (conferido)"
            : line.paidCents > 0
              ? ` (já conferido ${formatBrl(line.paidCents)} · falta ${formatBrl(line.remainingCents)})`
              : "";
        lines.push(
          `  ← ${nodeName(settlement, line.fromId)} ${formatBrl(line.amountCents)}${mark} — ${lineComponents(line)}`
        );
      });

      if (group.balanceCents > 0) {
        lines.push(`  Saldo: recebe ${formatBrl(group.balanceCents)}.`);
      } else if (group.balanceCents < 0) {
        lines.push(`  Saldo: paga ${formatBrl(-group.balanceCents)}.`);
      } else {
        lines.push("  Saldo: acertado.");
        if (group.remainingCents > 0) {
          lines.push("  O saldo já está zerado; as linhas acima são referência.");
        }
      }

      lines.push("");
    });

    lines.push(`Falta acertar ${formatBrl(settlement.totals.outstandingCents)} no saldo líquido.`);
  }

  lines.push(...summaryFooter(settlement));
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

export function buildOriginPersonSummary(settlement, session, nodeId, originPlan) {
  const node = settlement.nodes.find((item) => item.id === nodeId);
  if (!node) return "";
  if (originPlan?.error) return originPlan.error.message;

  const group = originPlan?.groups.find((item) => item.id === nodeId);
  const lines = [];

  lines.push(`🎰 Acerto — ${session.name || "Torneio"}`);
  lines.push("");
  lines.push(`${node.name}, seu resultado:`);
  lines.push("");

  if (group) {
    if (group.remainingCents > 0) {
      lines.push(`Você paga ${formatBrl(group.remainingCents)}:`);
    } else if (group.outgoing.length > 0) {
      lines.push("Suas transferências estão conferidas.");
    }

    group.outgoing.forEach((line) => {
      const mark =
        line.remainingCents === 0
          ? " (conferido)"
          : line.paidCents > 0
            ? ` (falta ${formatBrl(line.remainingCents)})`
            : "";
      lines.push(
        `· ${nodeName(settlement, line.toId)} — ${formatBrl(line.amountCents)} (${lineComponents(line)})${mark}`
      );
    });

    if (group.incomingRemainingCents > 0) {
      lines.push("");
      lines.push(`Você recebe ${formatBrl(group.incomingRemainingCents)}:`);

      group.incoming.forEach((line) => {
        const mark =
          line.remainingCents === 0
            ? " (conferido)"
            : line.paidCents > 0
              ? ` (já conferido ${formatBrl(line.paidCents)} · falta ${formatBrl(line.remainingCents)})`
              : "";
        lines.push(
          `· ${nodeName(settlement, line.fromId)} — ${formatBrl(line.amountCents)} (${lineComponents(line)})${mark}`
        );
      });
    }

    lines.push("");
  } else if (node.balanceCents <= 0) {
    lines.push("Você não tem nada a pagar.");
    lines.push("");
  }

  if (node.owedCents > 0) {
    lines.push("A receber:");

    if (node.breakdown.prizeCents > 0) {
      lines.push(`· prêmio ${formatBrlWhole(node.breakdown.prizeCents)}`);
    }

    if (node.breakdown.advancedCents > 0) {
      lines.push(`· adiantou ${formatBrl(node.breakdown.advancedCents)}`);
    }

    if (node.breakdown.stakeCents > 0) {
      lines.push(`· menos sua entrada ${formatBrl(node.breakdown.stakeCents)}`);
    }

    if (node.breakdown.costsCents > 0) {
      lines.push(`· menos custos ${formatBrl(node.breakdown.costsCents)}`);
    }

    lines.push(`Total: ${formatBrl(node.owedCents)}`);
    lines.push("");
  }

  if (node.balanceCents > 0) {
    lines.push(`Saldo final: recebe ${formatBrl(node.balanceCents)}`);
  } else if (node.balanceCents < 0) {
    lines.push(`Saldo final: paga ${formatBrl(-node.balanceCents)}`);
  } else {
    lines.push("Saldo final: acertado.");
    if (group && group.remainingCents > 0) {
      lines.push("O saldo já está zerado; as linhas acima são referência.");
    }
  }

  if (node.receivedCents > 0) {
    lines.push(`Já recebeu: ${formatBrl(node.receivedCents)}`);
  }

  if (node.sentCents > 0) {
    lines.push(`Já pagou: ${formatBrl(node.sentCents)}`);
  }

  return lines.join("\n");
}
