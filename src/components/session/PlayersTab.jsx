// src/components/session/PlayersTab.jsx

import React, { useRef, useState } from "react";
import { useSessionContext } from "../../context/SessionContext";
import { formatBrl } from "../../domain/money";
import { parsePlayerNames } from "../../domain/players";
import { MAX_PLAYERS } from "../../store/sessionStore";
import SessionConfigCard from "./SessionConfigCard";
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

export default function PlayersTab() {
  const {
    session,
    config,
    players,
    settlement,
    updateConfig,
    addPlayer,
    addPlayersByNames,
    removePlayer,
    removeAllPlayers,
    renamePlayer,
    adjustRebuys,
    toggleRateio,
  } = useSessionContext();

  const [newName, setNewName] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [status, setStatus] = useState("");
  const inputRef = useRef(null);

  const rowById = new Map(settlement.rows.map((row) => [row.id, row]));
  const anySeated = players.some((player) => player.seat);
  const room = Math.max(0, MAX_PLAYERS - players.length);
  const parsedNames = parsePlayerNames(bulkText);
  const namesToAdd = parsedNames.slice(0, room);
  const skipped = parsedNames.length - namesToAdd.length;
  const rateioPerPerson =
    settlement.rateio.participants > 0
      ? Math.round(settlement.rateio.totalCents / settlement.rateio.participants)
      : 0;

  const showStatus = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 3000);
  };

  const handleAdd = (event) => {
    event.preventDefault();
    const name = newName.trim();

    if (!name) return;

    addPlayer(name);
    setNewName("");
    showStatus(`${name} adicionado.`);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleBulkAdd = () => {
    if (!namesToAdd.length) return;

    addPlayersByNames(namesToAdd);
    setBulkText("");
    setBulkOpen(false);
    showStatus(
      namesToAdd.length === 1
        ? "1 jogador adicionado."
        : `${namesToAdd.length} jogadores adicionados.`
    );
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleRemove = (player) => {
    const isWinner = session.winners.some((winner) => winner.playerId === player.id);

    let detail = "";
    if (player.seat) {
      detail = `O assento ${player.seat} será removido.`;
    } else if (player.rebuys > 0) {
      detail =
        player.rebuys === 1
          ? "O rebuy será removido."
          : `Os ${player.rebuys} rebuys serão removidos.`;
    } else if (isWinner) {
      detail = "O prêmio será removido.";
    }

    if (detail) {
      const confirmed = window.confirm(
        `Remover ${player.name || "jogador"}? ${detail}`
      );
      if (!confirmed) return;
    }

    removePlayer(player.id);
  };

  const handleRemoveAll = () => {
    if (!players.length) return;

    const target =
      players.length === 1 ? "o jogador" : `os ${players.length} jogadores`;
    const confirmed = window.confirm(
      `Excluir ${target}? Rebuys, assentos, prêmios e chaves PIX serão removidos.`
    );

    if (!confirmed) return;

    removeAllPlayers();
    showStatus(players.length === 1 ? "Jogador removido." : "Jogadores removidos.");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle meta={`${players.length}/${MAX_PLAYERS}`}>Jogadores</SectionTitle>
        <p className="mt-1 text-xs text-gray-400">Inclua o host na lista.</p>

        <form onSubmit={handleAdd} className="mt-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nome do jogador"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            maxLength={40}
            className={`${inputClass} min-w-0 flex-1`}
            aria-label="Nome do jogador"
          />
          <Button
            type="submit"
            icon="person_add"
            disabled={!newName.trim()}
            className="shrink-0"
          >
            Adicionar
          </Button>
        </form>
        <p className="mt-1 text-xs text-gray-400">
          Enter adiciona e deixa o campo pronto para o próximo.
        </p>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon="content_paste"
          onClick={() => setBulkOpen((open) => !open)}
          aria-expanded={bulkOpen}
          aria-controls="bulk-names"
          className="-ml-2 mt-1"
        >
          {bulkOpen ? "Fechar lista" : "Colar lista de nomes"}
        </Button>

        {bulkOpen && (
          <div id="bulk-names" className="mt-2 rounded-lg border border-white/10 bg-gray-950/40 p-3">
            <Field
              label="Um nome por linha"
              htmlFor="bulk-names-text"
              hint={
                parsedNames.length > 0
                  ? `${parsedNames.length} ${parsedNames.length === 1 ? "nome encontrado" : "nomes encontrados"}${
                      skipped > 0 ? ` · ${skipped} excedem o limite de ${MAX_PLAYERS}` : ""
                    }`
                  : undefined
              }
            >
              <textarea
                id="bulk-names-text"
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                rows={6}
                placeholder="Cole os nomes aqui"
                className={`${inputClass} min-h-36 resize-y`}
              />
            </Field>

            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                icon="person_add"
                onClick={handleBulkAdd}
                disabled={!namesToAdd.length}
              >
                {namesToAdd.length ? `Adicionar ${namesToAdd.length}` : "Adicionar"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBulkOpen(false);
                  setBulkText("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {status && (
          <p role="status" className="mt-2 text-xs text-green-300">
            {status}
          </p>
        )}

        {players.length > 0 && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <Button
              variant="dangerGhost"
              size="sm"
              icon="delete_sweep"
              onClick={handleRemoveAll}
            >
              Excluir todos os jogadores
            </Button>
          </div>
        )}
      </Card>

      {players.length === 0 && (
        <EmptyState
          icon="group_off"
          title="Nenhum jogador ainda"
          description="Digite um nome ou cole a lista do grupo."
        />
      )}

      {players.length > 0 && (
        <div className="space-y-2">
          {players.map((player) => {
            const row = rowById.get(player.id);
            const overCap = player.rebuys > config.maxRebuys;

            return (
              <div key={player.id} className="rounded-xl border border-white/10 bg-gray-900 p-3">
                <div className="flex items-center gap-2">
                  {(player.seat || anySeated) && (
                    <Badge tone={player.seat ? "neutral" : "amber"}>
                      {player.seat ? `Assento ${player.seat}` : "Sem assento"}
                    </Badge>
                  )}
                  <input
                    type="text"
                    value={player.name}
                    onChange={(event) => renamePlayer(player.id, event.target.value)}
                    maxLength={40}
                    className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-base font-semibold text-white transition-colors hover:border-white/15 focus:border-green-400/60 focus:outline-none ${focusRing}`}
                    aria-label="Nome do jogador"
                  />
                  <IconButton
                    icon="delete"
                    label={`Remover ${player.name || "jogador"}`}
                    variant="dangerGhost"
                    onClick={() => handleRemove(player)}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Rebuys</span>
                    <IconButton
                      icon="remove"
                      label={`Remover rebuy de ${player.name || "jogador"}`}
                      variant="secondary"
                      onClick={() => adjustRebuys(player.id, -1)}
                      disabled={player.rebuys <= 0}
                    />
                    <span className="min-w-12 text-center font-mono text-sm tabular-nums text-gray-200">
                      {player.rebuys}/{config.maxRebuys}
                    </span>
                    <IconButton
                      icon="add"
                      label={`Adicionar rebuy para ${player.name || "jogador"}`}
                      variant="secondary"
                      onClick={() => adjustRebuys(player.id, 1)}
                      disabled={player.rebuys >= config.maxRebuys}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={player.inRateio}
                      onChange={() => toggleRateio(player.id)}
                      className="h-4 w-4 accent-green-500"
                    />
                    Participa do rateio
                  </label>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span className="tabular-nums">Jogo {formatBrl(row?.gameCents ?? 0)}</span>
                  <span className="tabular-nums">Rateio {formatBrl(row?.rateioCents ?? 0)}</span>
                  <span className="font-semibold tabular-nums text-gray-200">
                    Total {formatBrl(row?.totalInvestedCents ?? 0)}
                  </span>
                </div>

                {overCap && (
                  <Alert tone="warning" className="mt-2 text-xs">
                    Acima do máximo atual de {config.maxRebuys} rebuys.
                  </Alert>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <SectionTitle meta={`${settlement.rateio.participants} participantes`}>
          Pote e rateio
        </SectionTitle>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3 text-gray-300">
            <dt>Pote</dt>
            <dd className="tabular-nums">{formatBrl(settlement.pool.poolCents)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-gray-300">
            <dt>Rateio</dt>
            <dd className="tabular-nums">{formatBrl(settlement.rateio.totalCents)}</dd>
          </div>
          {rateioPerPerson > 0 && (
            <div className="text-right text-xs text-gray-400">
              ~{formatBrl(rateioPerPerson)} por participante
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-white/10 pt-2 font-semibold text-white">
            <dt>Total investido</dt>
            <dd className="tabular-nums">{formatBrl(settlement.totals.totalInvestedCents)}</dd>
          </div>
        </dl>
      </Card>

      <Accordion
        id="tournament-rules"
        title="Regras do torneio"
        meta={`Buy-in ${formatBrl(config.buyInCents)} · Rebuy ${formatBrl(config.rebuyCents)} · ${config.paidPlaces} premiados`}
      >
        <SessionConfigCard
          config={config}
          players={players}
          onChange={updateConfig}
          hideHeader
        />
      </Accordion>
    </div>
  );
}
