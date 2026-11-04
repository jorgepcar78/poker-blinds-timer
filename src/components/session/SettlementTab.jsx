// src/components/session/SettlementTab.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSessionContext } from "../../context/SessionContext";
import {
  formatBrl,
  formatBrlWhole,
  formatPerPerson,
  parseBrlToCents,
} from "../../domain/money";
import { buildTransferPlan } from "../../domain/settlement";
import { buildGroupSummary, buildPersonSummary } from "../../domain/summary";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  SectionTitle,
} from "../ui/ui";
import { focusRing, inputClass } from "../ui/styles";

function formatMoneyInput(cents) {
  return (Number(cents || 0) / 100).toFixed(2).replace(".", ",");
}

function MoneyInput({ cents, onChange, className = "", ...props }) {
  const [draft, setDraft] = useState(null);
  const value = draft ?? formatMoneyInput(cents);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        const parsed = parseBrlToCents(raw);
        if (parsed !== null) onChange(parsed);
      }}
      onBlur={() => {
        const raw = draft ?? formatMoneyInput(cents);
        const parsed = parseBrlToCents(raw);

        if (raw.trim() === "") {
          setDraft(null);
          onChange(0);
          return;
        }

        if (parsed === null) {
          setDraft(null);
          return;
        }

        setDraft(null);
        onChange(parsed);
      }}
      className={`${inputClass} ${className}`}
      {...props}
    />
  );
}

function chipClass(selected) {
  return `inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${focusRing} ${
    selected
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
  }`;
}

export default function SettlementTab() {
  const {
    session,
    players,
    costs,
    creditors,
    payments,
    cash,
    winnerSlots,
    settlement,
    setWinner,
    clearWinners,
    addCost,
    updateCost,
    removeCost,
    toggleCostParticipant,
    addCreditor,
    removeCreditor,
    addPayment,
    removePayment,
    setCash,
  } = useSessionContext();

  const [summary, setSummary] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("direct");
  const [caixaId, setCaixaId] = useState("");
  const [externalName, setExternalName] = useState("");
  const [personId, setPersonId] = useState("");
  const [manualFrom, setManualFrom] = useState("");
  const [manualTo, setManualTo] = useState("");
  const [manualAmount, setManualAmount] = useState(0);
  const flashTimer = useRef(null);
  const copyTimer = useRef(null);

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const nodeById = useMemo(
    () => new Map(settlement.nodes.map((node) => [node.id, node])),
    [settlement.nodes]
  );
  const playerIds = useMemo(() => new Set(players.map((player) => player.id)), [players]);
  const nodeIds = useMemo(
    () => new Set(settlement.nodes.map((node) => node.id)),
    [settlement.nodes]
  );
  const holderId =
    (playerIds.has(caixaId) ? caixaId : "") ||
    (playerIds.has(cash.holderId) ? cash.holderId : "") ||
    players[0]?.id ||
    "";
  const transfers = useMemo(
    () => buildTransferPlan(settlement, { mode, holderId }),
    [settlement, mode, holderId]
  );

  const groups = useMemo(() => {
    const list = [];
    const byPayer = new Map();

    transfers.forEach((transfer) => {
      if (!byPayer.has(transfer.fromId)) {
        const group = { payer: nodeById.get(transfer.fromId), items: [] };
        byPayer.set(transfer.fromId, group);
        list.push(group);
      }
      byPayer.get(transfer.fromId).items.push(transfer);
    });

    return list;
  }, [transfers, nodeById]);

  const nameOf = (nodeId) => nodeById.get(nodeId)?.name || "Alguém";

  const flash = (message) => {
    setStatus(message);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setStatus(""), 3000);
  };

  const handlePay = (transfer) => {
    const registered = addPayment({
      fromId: transfer.fromId,
      toId: transfer.toId,
      amountCents: transfer.amountCents,
    });

    flash(
      registered
        ? `Pagamento de ${nameOf(transfer.fromId)} para ${nameOf(transfer.toId)} registrado.`
        : "Não foi possível registrar o pagamento."
    );
  };

  const effectiveFrom = playerIds.has(manualFrom)
    ? manualFrom
    : players[0]?.id || "";
  const defaultTo =
    settlement.receivables.find((node) => node.id !== effectiveFrom)?.id ||
    settlement.nodes.find((node) => node.id !== effectiveFrom)?.id ||
    "";
  const effectiveTo =
    nodeIds.has(manualTo) && manualTo !== effectiveFrom ? manualTo : defaultTo;
  const effectivePerson = settlement.nodes.some((node) => node.id === personId)
    ? personId
    : settlement.nodes[0]?.id || "";

  const handleManual = () => {
    if (!effectiveFrom || !effectiveTo) {
      flash("Escolha quem paga e quem recebe.");
      return;
    }

    if (effectiveFrom === effectiveTo) {
      flash("Escolha pessoas diferentes.");
      return;
    }

    if (manualAmount <= 0) {
      flash("Informe um valor.");
      return;
    }

    if (!addPayment({ fromId: effectiveFrom, toId: effectiveTo, amountCents: manualAmount })) {
      flash("Não foi possível registrar o pagamento.");
      return;
    }

    setManualAmount(0);
    flash("Pagamento registrado.");
  };

  const handleAddExternal = () => {
    if (!externalName.trim()) return;
    addCreditor(externalName);
    setExternalName("");
  };

  const showGroupSummary = () => {
    setSummary(buildGroupSummary(settlement, session, transfers));
  };

  const showPersonSummary = () => {
    const target = effectivePerson;
    if (!target) return;
    setSummary(buildPersonSummary(settlement, session, target, transfers));
  };

  const handleCopy = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("Resumo copiado!");
    } catch {
      setCopyStatus("Não foi possível copiar. Selecione o texto abaixo.");
    }

    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyStatus(""), 2500);
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

  const prizeFor = (slot) =>
    settlement.payouts.find((payout) => payout.playerId === slot.playerId)?.prizeCents ?? 0;

  const percentOfPool = (cents) =>
    settlement.totals.poolCents > 0
      ? `${((cents / settlement.totals.poolCents) * 100).toFixed(1).replace(".", ",")}%`
      : "0%";

  const costRowsById = new Map(settlement.costs.rows.map((row) => [row.id, row]));

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle meta={`Pote ${formatBrl(settlement.totals.poolCents)}`}>
            Fichas dos premiados
          </SectionTitle>
          <Button variant="ghost" size="sm" onClick={clearWinners}>
            Limpar
          </Button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          A colocação é definida pelas fichas. O prêmio é proporcional às fichas, arredondado
          para reais inteiros, e a soma fecha exatamente com o pote.
        </p>

        <div className="mt-3 space-y-3">
          {winnerSlots.map((slot, index) => {
            const selectedIds = new Set(
              winnerSlots.map((item) => item.playerId).filter(Boolean)
            );
            selectedIds.delete(slot.playerId);
            const prizeCents = prizeFor(slot);

            return (
              <div
                key={index}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-200">
                    Premiado {index + 1}
                  </span>
                  {prizeCents > 0 && (
                    <Badge tone="green">
                      {formatBrlWhole(prizeCents)} · {percentOfPool(prizeCents)}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={slot.playerId || ""}
                    onChange={(event) =>
                      setWinner(index, {
                        playerId: event.target.value,
                        chips: slot.chips ?? null,
                      })
                    }
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
              </div>
            );
          })}
        </div>

        {settlement.warnings.map((warning, index) => (
          <Alert key={`${warning.code}-${index}`} tone="warning" className="mt-3 text-xs">
            {warning.message}
          </Alert>
        ))}
      </Card>

      <Accordion
        id="settlement-costs"
        title="Custos da noite"
        meta={`${formatBrl(settlement.totals.costsCents)} · ${costs.length} custo(s)`}
        defaultOpen
      >
        <p className="text-xs leading-relaxed text-gray-400">
          Cada custo tem o próprio conjunto de participantes e um responsável que adiantou o
          dinheiro. Quem não aparece nos chips não paga aquele custo.
        </p>

        <div className="mt-3 space-y-3">
          {costs.map((cost) => {
            const row = costRowsById.get(cost.id);
            const error = row?.error;

            return (
              <div
                key={cost.id}
                className="rounded-lg border border-white/10 bg-gray-950/40 p-3"
              >
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={cost.label}
                    onChange={(event) => updateCost(cost.id, { label: event.target.value })}
                    onBlur={(event) => {
                      if (!event.target.value.trim()) {
                        updateCost(cost.id, { label: "Custo" });
                      }
                    }}
                    maxLength={24}
                    className={`${inputClass} min-w-0 flex-1`}
                    aria-label="Nome do custo"
                  />
                  <div className="w-28 shrink-0">
                    <MoneyInput
                      cents={cost.amountCents}
                      onChange={(value) => updateCost(cost.id, { amountCents: value })}
                      aria-label="Valor do custo"
                    />
                  </div>
                  <IconButton
                    icon="delete"
                    label={`Remover ${cost.label}`}
                    variant="dangerGhost"
                    onClick={() => removeCost(cost.id)}
                  />
                </div>

                <div className="mt-2">
                  <label
                    htmlFor={`cost-creditor-${cost.id}`}
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Quem adiantou
                  </label>
                  <select
                    id={`cost-creditor-${cost.id}`}
                    value={cost.creditorId}
                    onChange={(event) =>
                      updateCost(cost.id, { creditorId: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">— escolher —</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name || "Sem nome"}
                      </option>
                    ))}
                    {creditors.map((creditor) => (
                      <option key={creditor.id} value={creditor.id}>
                        {creditor.name} (fora)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-gray-400">Divide entre</span>
                  <span className="font-semibold tabular-nums text-gray-200">
                    {cost.participantIds.length} de {players.length} ·{" "}
                    {formatPerPerson(cost.amountCents, cost.participantIds.length)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {players.map((player) => {
                    const selected = cost.participantIds.includes(player.id);

                    return (
                      <button
                        key={player.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleCostParticipant(cost.id, player.id)}
                        className={chipClass(selected)}
                      >
                        {player.name || "Sem nome"}
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <Alert tone="warning" className="mt-2 text-xs">
                    {error.message}
                  </Alert>
                )}
              </div>
            );
          })}
        </div>

        {costs.length === 0 && (
          <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-gray-400">
            Nenhum custo nesta noite.
          </p>
        )}

        <Button
          variant="secondary"
          size="sm"
          icon="add"
          onClick={() => addCost()}
          className="mt-3"
        >
          Adicionar custo
        </Button>

        <div className="mt-4 border-t border-white/10 pt-3">
          <Field
            label="Pessoa de fora"
            hint="Alguém que adiantou dinheiro e não está jogando. Aparece em A receber."
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={externalName}
                onChange={(event) => setExternalName(event.target.value)}
                maxLength={40}
                placeholder="Ex.: Seu Antônio"
                className={`${inputClass} min-w-0 flex-1`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddExternal}
                disabled={!externalName.trim()}
              >
                Adicionar
              </Button>
            </div>
          </Field>

          {creditors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {creditors.map((creditor) => (
                <span
                  key={creditor.id}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-0.5 pl-3 pr-0.5 text-xs text-gray-300"
                >
                  {creditor.name}
                  <button
                    type="button"
                    onClick={() => {
                      const inUse =
                        costs.some((cost) => cost.creditorId === creditor.id) ||
                        payments.some(
                          (payment) =>
                            payment.fromId === creditor.id || payment.toId === creditor.id
                        );

                      if (
                        inUse &&
                        !window.confirm(
                          `Remover ${creditor.name}? Custos e pagamentos ligados a essa pessoa serão desligados.`
                        )
                      ) {
                        return;
                      }

                      removeCreditor(creditor.id);
                    }}
                    aria-label={`Remover ${creditor.name}`}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white ${focusRing}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Accordion>

      <Card>
        <SectionTitle>Dinheiro já em mãos</SectionTitle>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={cash.inHand}
            onChange={(event) =>
              setCash({
                inHand: event.target.checked,
                holderId: cash.holderId || players[0]?.id || null,
              })
            }
            className="mt-0.5 h-5 w-5 shrink-0 accent-green-500"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">
              Buy-in e rebuys já foram pagos em dinheiro
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-gray-400">
              Marque se o dinheiro do jogo já está com alguém. O plano passa a cobrar só o que
              falta.
            </span>
          </span>
        </label>

        {cash.inHand && (
          <Field label="Quem está com o dinheiro" className="mt-3">
            <select
              value={cash.holderId || ""}
              onChange={(event) => setCash({ holderId: event.target.value || null })}
              className={inputClass}
            >
              <option value="">— escolher —</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name || "Sem nome"}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Card>

      <Card>
        {settlement.errors.length > 0 ? (
          <div className="space-y-2">
            {settlement.errors.map((error, index) => (
              <Alert key={`${error.code}-${index}`} tone="error" className="text-xs">
                {error.message}
              </Alert>
            ))}
          </div>
        ) : !settlement.isComplete ? (
          <Alert tone="warning">
            Preencha as fichas dos premiados para liberar o acerto.
          </Alert>
        ) : settlement.totals.outstandingCents === 0 ? (
          <Alert tone="success">
            Tudo acertado. Ninguém deve nada.
          </Alert>
        ) : (
          <Alert tone="info">
            Números fecham em R$ 0,00. Falta acertar{" "}
            {formatBrl(settlement.totals.outstandingCents)}.
          </Alert>
        )}
      </Card>

      <Card>
        <SectionTitle meta={`${settlement.receivables.length} pessoa(s)`}>
          A receber
        </SectionTitle>

        <div className="mt-3 space-y-3">
          {settlement.receivables.map((node) => {
            const parts = [];

            if (node.breakdown.prizeCents > 0) {
              parts.push(`prêmio ${formatBrlWhole(node.breakdown.prizeCents)}`);
            }
            if (node.breakdown.advancedCents > 0) {
              parts.push(`adiantou ${formatBrl(node.breakdown.advancedCents)}`);
            }
            if (node.breakdown.costsCents > 0) {
              parts.push(`menos ${formatBrl(node.breakdown.costsCents)} de custos`);
            }
            if (node.receivedCents > 0) {
              parts.push(`já recebeu ${formatBrl(node.receivedCents)}`);
            }

            return (
              <div key={node.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-white">{node.name}</span>
                    {node.kind === "external" && <Badge tone="gray">fora do jogo</Badge>}
                  </span>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-green-300">
                    {formatBrl(node.balanceCents)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
                  {parts.join(" · ") || "a receber"}
                </p>
              </div>
            );
          })}

          {settlement.receivables.length === 0 && (
            <p className="text-xs text-gray-400">Ninguém tem valor a receber.</p>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle meta={`${transfers.length} transferência(s)`}>
          Quem paga quem
        </SectionTitle>

        <div
          role="group"
          aria-label="Modo do acerto"
          className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-gray-950 p-1"
        >
          {[
            ["direct", "Direto"],
            ["caixa", "Tudo no caixa"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors ${focusRing} ${
                mode === value
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          {mode === "direct"
            ? "Cada um paga direto a quem recebe. Menos linhas, sem ninguém carregar o dinheiro dos outros."
            : "Todos acertam com uma pessoa, que paga os credores. Útil quando o dinheiro já está com ela."}
        </p>

        {mode === "caixa" && (
          <Field label="Caixa" className="mt-3">
            <select
              value={holderId}
              onChange={(event) => setCaixaId(event.target.value)}
              className={inputClass}
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name || "Sem nome"}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="mt-3 space-y-2">
          {groups.map((group) => {
            const total = group.items.reduce((sum, item) => sum + item.amountCents, 0);

            return (
              <div
                key={group.payer?.id || "payer"}
                className="rounded-lg border border-white/10 bg-gray-950/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">
                    {group.payer?.name || "Alguém"}
                  </span>
                  <Badge tone="amber">paga {formatBrl(total)}</Badge>
                </div>

                {group.items.map((transfer) => (
                  <div
                    key={`${transfer.fromId}-${transfer.toId}`}
                    className="mt-2 flex items-center justify-between gap-3 border-t border-white/5 pt-2"
                  >
                    <span className="min-w-0 text-sm text-gray-300">
                      →{" "}
                      <span className="font-semibold text-white">
                        {nameOf(transfer.toId)}
                      </span>{" "}
                      <span className="tabular-nums">{formatBrl(transfer.amountCents)}</span>
                    </span>
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => handlePay(transfer)}
                    >
                      Registrar pagamento
                    </Button>
                  </div>
                ))}
              </div>
            );
          })}

          {groups.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-gray-400">
              {!settlement.isComplete
                ? "Preencha os premiados para liberar o plano."
                : settlement.ok
                  ? "Nenhuma transferência pendente."
                  : "Corrija os dados para gerar o plano."}
            </p>
          )}
        </div>

        {groups.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-gray-400">
            Use <span className="font-semibold text-gray-200">Registrar pagamento</span> quando
            o dinheiro já estiver com quem recebe. Para valor parcial ou outra pessoa, use o
            bloco abaixo.
          </p>
        )}
      </Card>

      <Accordion
        id="settlement-manual"
        title="Registrar outro pagamento"
        meta="valor parcial ou outra pessoa"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="De">
            <select
              value={effectiveFrom}
              onChange={(event) => setManualFrom(event.target.value)}
              className={inputClass}
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name || "Sem nome"}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Para">
            <select
              value={effectiveTo}
              onChange={(event) => setManualTo(event.target.value)}
              className={inputClass}
            >
              {settlement.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                  {node.kind === "external" ? " (fora)" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-2 flex gap-2">
          <div className="min-w-0 flex-1">
            <MoneyInput
              cents={manualAmount}
              onChange={setManualAmount}
              aria-label="Valor do pagamento"
            />
          </div>
          <Button onClick={handleManual} disabled={manualAmount <= 0}>
            Registrar
          </Button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          Aceita valor parcial e pagamento a mais. O saldo e o plano se recalculam.
        </p>
      </Accordion>

      <Accordion
        id="settlement-payments"
        title="Pagamentos registrados"
        meta={`${payments.length} registro(s)`}
      >
        <div className="space-y-2">
          {payments.slice().reverse().map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="min-w-0 text-gray-300">
                {nameOf(payment.fromId)} → {nameOf(payment.toId)}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-semibold tabular-nums text-white">
                  {formatBrl(payment.amountCents)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePayment(payment.id)}
                >
                  desfazer
                </Button>
              </span>
            </div>
          ))}

          {payments.length === 0 && (
            <p className="text-xs text-gray-400">Nada registrado ainda.</p>
          )}
        </div>

        {cash.inHand && (
          <Alert tone="info" className="mt-3 text-xs">
            Buy-in e rebuys marcados como pagos em dinheiro para{" "}
            {cash.holderId ? nameOf(cash.holderId) : "o caixa"}.
          </Alert>
        )}
      </Accordion>

      <Accordion
        id="settlement-detail"
        title="Detalhe por jogador"
        meta={`${players.length} jogador(es)`}
      >
        <div className="space-y-3">
          {settlement.rows.map((row) => {
            const positive = row.balanceCents > 0;
            const negative = row.balanceCents < 0;

            return (
              <div key={row.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {row.position && <Badge tone="green">{row.position}º</Badge>}
                    <span className="font-semibold text-white">
                      {row.name || "Sem nome"}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      positive
                        ? "text-green-300"
                        : negative
                          ? "text-red-300"
                          : "text-gray-400"
                    }`}
                  >
                    {positive
                      ? `recebe ${formatBrl(row.balanceCents)}`
                      : negative
                        ? `paga ${formatBrl(-row.balanceCents)}`
                        : "sem saldo"}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span className="tabular-nums">Jogo {formatBrl(row.gameCents)}</span>
                  {row.costShares.map((share) => (
                    <span key={share.costId} className="tabular-nums">
                      {share.label} {formatBrl(share.cents)}
                    </span>
                  ))}
                  {row.prizeCents > 0 && (
                    <span className="tabular-nums text-green-300/80">
                      Prêmio {formatBrlWhole(row.prizeCents)}
                    </span>
                  )}
                  {row.sentCents > 0 && (
                    <span className="tabular-nums">já pagou {formatBrl(row.sentCents)}</span>
                  )}
                  {row.receivedCents > 0 && (
                    <span className="tabular-nums">
                      já recebeu {formatBrl(row.receivedCents)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Accordion>

      <Accordion id="settlement-share" title="Resumo para WhatsApp">
        <div className="flex gap-2">
          <select
            value={effectivePerson}
            onChange={(event) => setPersonId(event.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
            aria-label="Pessoa para a mensagem individual"
          >
            {settlement.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
                {node.kind === "external" ? " (fora)" : ""}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={showPersonSummary}
            disabled={!settlement.isComplete}
          >
            Mensagem
          </Button>
        </div>

        <Button
          variant="secondary"
          className="mt-2 w-full"
          onClick={showGroupSummary}
          disabled={!settlement.isComplete}
        >
          Resumo geral do grupo
        </Button>

        <textarea
          readOnly
          value={summary}
          rows={12}
          className="mt-2 min-h-44 w-full resize-y rounded-lg border border-white/10 bg-gray-950 p-3 font-mono text-xs text-gray-200 focus:outline-none"
          aria-label="Resumo do acerto"
        />

        <Button className="mt-2 w-full" onClick={handleCopy} disabled={!summary}>
          Copiar texto
        </Button>

        {copyStatus && (
          <p role="status" className="mt-2 text-center text-xs text-green-300">
            {copyStatus}
          </p>
        )}
      </Accordion>

      {status && (
        <p role="status" className="text-center text-xs text-green-300">
          {status}
        </p>
      )}
    </div>
  );
}
