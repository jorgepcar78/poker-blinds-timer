// src/components/session/SettlementTab.jsx

import React, { useState } from "react";
import { useSessionContext } from "../../context/SessionContext";
import { formatBrl } from "../../domain/money";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  IconButton,
  SectionTitle,
} from "../ui/ui";
import { focusRing, inputClass } from "../ui/styles";

function buildSummaryText(session, settlement) {
  const playerById = new Map(session.players.map((player) => [player.id, player]));
  const pixByPlayer = new Map(
    session.winners.map((winner) => [
      winner.playerId,
      String(winner.pix?.[0] ?? "").trim(),
    ])
  );

  const winners = [...settlement.payouts].sort((a, b) => a.position - b.position);
  const others = settlement.rows
    .filter((row) => !row.position)
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99) || a.name.localeCompare(b.name));

  const actionText = (balance) =>
    balance > 0
      ? `recebe ${formatBrl(balance)}`
      : balance < 0
        ? `paga ${formatBrl(-balance)}`
        : "sem saldo";

  const lines = [
    session.name || "Torneio",
    `Pote: ${formatBrl(settlement.totals.poolCents)} | Custos: ${formatBrl(settlement.totals.costsCents)} | Total investido: ${formatBrl(settlement.totals.totalInvestedCents)}`,
    "",
  ];

  winners.forEach((payout) => {
    const player = playerById.get(payout.playerId);
    const row = settlement.rows.find((item) => item.id === payout.playerId);
    const pix = pixByPlayer.get(payout.playerId) || "não informado";

    lines.push(
      `${payout.position}º ${row?.name || player?.name || "Sem nome"} — ${actionText(row?.balanceCents ?? 0)} — PIX: ${pix}`
    );
  });

  if (others.length > 0) {
    lines.push("");

    others.forEach((row, index) => {
      const position = settlement.paidPlaces + index + 1;
      lines.push(`${position}. ${row.name || "Sem nome"} — ${actionText(row.balanceCents)}`);
    });
  }

  return lines.join("\n");
}

export default function SettlementTab() {
  const { session, players, winnerSlots, settlement, setWinner, clearWinners } =
    useSessionContext();

  const [copyStatus, setCopyStatus] = useState("");
  const summaryText = buildSummaryText(session, settlement);
  const pixByPlayer = new Map(
    session.winners
      .filter((winner) => winner.playerId)
      .map((winner) => [winner.playerId, String(winner.pix?.[0] ?? "").trim()])
  );

  const sortedRows = [...settlement.rows].sort((a, b) => {
    if (a.position && b.position) return a.position - b.position;
    if (a.position) return -1;
    if (b.position) return 1;
    return (a.seat ?? 99) - (b.seat ?? 99) || a.name.localeCompare(b.name);
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus("Resumo copiado!");
    } catch {
      setCopyStatus("Não foi possível copiar. Use o resumo abaixo.");
    }

    window.setTimeout(() => setCopyStatus(""), 2500);
  };

  if (players.length < 2) {
    return (
      <EmptyState
        icon="group"
        title="Faltam jogadores"
        description="Cadastre pelo menos dois jogadores na aba Jogadores para fazer o acerto."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>Fichas dos premiados</SectionTitle>
          <Button variant="ghost" size="sm" onClick={clearWinners}>
            Limpar
          </Button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          A colocação é definida pelas fichas. O prêmio é proporcional à soma das fichas dos
          premiados. Informe a chave PIX de cada premiado para incluir no resumo.
        </p>

        <div className="mt-3 space-y-3">
          {winnerSlots.map((slot, index) => {
            const selectedIds = new Set(
              winnerSlots.map((item) => item.playerId).filter(Boolean)
            );
            selectedIds.delete(slot.playerId);

            const selectedPlayer =
              players.find((player) => player.id === slot.playerId) ?? null;
            const pixKey = slot.pix?.[0] ?? "";

            const updatePix = (value) => {
              const next = value.slice(0, 140);
              setWinner(index, { pix: next ? [next] : [] });
            };

            return (
              <div key={index} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-sm font-semibold text-gray-200">
                  Premiado {index + 1}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={slot.playerId || ""}
                    onChange={(event) => {
                      const nextPlayerId = event.target.value;
                      setWinner(index, {
                        playerId: nextPlayerId,
                        chips: slot.chips ?? null,
                        pix:
                          slot.playerId && slot.playerId !== nextPlayerId
                            ? []
                            : slot.pix ?? [],
                      });
                    }}
                    className={inputClass}
                    aria-label={`Jogador do ${index + 1}º premiado`}
                  >
                    <option value="">Selecione o jogador</option>
                    {players.map((player) => (
                      <option
                        key={player.id}
                        value={player.id}
                        disabled={selectedIds.has(player.id)}
                      >
                        {player.name || "Sem nome"}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    step="1000"
                    inputMode="numeric"
                    value={slot.chips ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setWinner(index, {
                        chips: raw === "" ? null : Math.max(0, Math.round(Number(raw) || 0)),
                      });
                    }}
                    placeholder="Fichas finais"
                    className={inputClass}
                    aria-label={`Fichas do ${index + 1}º premiado`}
                  />
                </div>

                <div className="mt-3">
                  <label
                    htmlFor={`winner-${index}-pix`}
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Chave PIX
                    {selectedPlayer ? ` de ${selectedPlayer.name || "jogador"}` : ""}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={`winner-${index}-pix`}
                      type="text"
                      value={pixKey}
                      onChange={(event) => updatePix(event.target.value)}
                      placeholder="CPF, telefone ou chave"
                      className={`${inputClass} min-w-0 flex-1`}
                    />
                    {pixKey && (
                      <IconButton
                        icon="close"
                        label="Limpar chave PIX"
                        variant="dangerGhost"
                        onClick={() => setWinner(index, { pix: [] })}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {settlement.warnings.map((warning, index) => (
          <Alert key={`${warning.code}-${index}`} tone="warning" className="mt-3 text-xs">
            {warning.message}
          </Alert>
        ))}

        {settlement.errors.map((error, index) => (
          <Alert key={`${error.code}-${index}`} tone="error" className="mt-3 text-xs">
            {error.message}
          </Alert>
        ))}
      </Card>

      <section>
        <SectionTitle className="mb-2">Acerto por jogador</SectionTitle>

        <div className="space-y-2">
          {sortedRows.map((row) => {
            const positive = row.balanceCents > 0;
            const negative = row.balanceCents < 0;
            const pix = pixByPlayer.get(row.id) || "";

            return (
              <div
                key={row.id}
                className={`rounded-xl border p-3 ${
                  row.position
                    ? "border-green-500/20 bg-green-500/10"
                    : "border-white/10 bg-gray-900"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {row.position && (
                      <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-gray-950">
                        {row.position}º
                      </span>
                    )}
                    <span className="font-semibold text-white">{row.name || "Sem nome"}</span>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      positive ? "text-green-300" : negative ? "text-red-300" : "text-gray-400"
                    }`}
                  >
                    {positive
                      ? `recebe ${formatBrl(row.balanceCents)}`
                      : negative
                        ? `paga ${formatBrl(-row.balanceCents)}`
                        : "sem saldo"}
                  </span>
                </div>

                {row.position && (
                  <p
                    className={`mt-1 break-all text-xs ${
                      pix ? "text-gray-400" : "text-amber-300"
                    }`}
                  >
                    PIX: {pix || "não informado"}
                  </p>
                )}

                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-400">
                  <span className="tabular-nums">Jogo {formatBrl(row.gameCents)}</span>
                  <span className="tabular-nums">Rateio {formatBrl(row.rateioCents)}</span>
                  <span className="tabular-nums">Investido {formatBrl(row.totalInvestedCents)}</span>
                  <span className="tabular-nums">Prêmio {formatBrl(row.prizeCents)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Card>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-3 text-gray-300">
            <dt>Pote</dt>
            <dd className="tabular-nums">{formatBrl(settlement.totals.poolCents)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-gray-300">
            <dt>Prêmios</dt>
            <dd className="tabular-nums">{formatBrl(settlement.totals.prizesCents)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-gray-300">
            <dt>Custos (salão + snacks)</dt>
            <dd className="tabular-nums">{formatBrl(settlement.totals.costsCents)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-gray-300">
            <dt>Total investido</dt>
            <dd className="tabular-nums">{formatBrl(settlement.totals.totalInvestedCents)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-white/10 pt-2 font-semibold text-white">
            <dt>Conferência</dt>
            <dd className={settlement.isComplete ? "text-green-300" : "text-amber-300"}>
              {settlement.isComplete
                ? settlement.totals.cashDifferenceCents === 0
                  ? "fecha em R$ 0,00"
                  : `diferença de ${formatBrl(settlement.totals.cashDifferenceCents)}`
                : "aguardando premiados"}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          Total investido = prêmios + custos. O saldo de cada jogador já desconta o rateio.
        </p>
      </Card>

      <Button
        icon="content_copy"
        onClick={handleCopy}
        disabled={!settlement.isComplete}
        className="w-full"
      >
        Copiar resumo para WhatsApp
      </Button>
      {copyStatus && (
        <p role="status" className="text-center text-xs text-green-300">
          {copyStatus}
        </p>
      )}

      <details className="rounded-xl border border-white/10 bg-gray-900">
        <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-200 [&::-webkit-details-marker]:hidden ${focusRing}`}>
          <span>Resumo para WhatsApp</span>
          <span className="text-xs text-gray-400">Ver texto</span>
        </summary>
        <textarea
          readOnly
          value={summaryText}
          rows={10}
          className="min-h-44 w-full resize-y border-t border-white/10 bg-gray-950 p-3 font-mono text-xs text-gray-200 focus:outline-none"
        />
      </details>
    </div>
  );
}
