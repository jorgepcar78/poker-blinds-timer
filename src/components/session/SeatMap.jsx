// src/components/session/SeatMap.jsx

import React, { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useSessionContext } from "../../context/SessionContext";
import Icon from "../ui/Icon";
import { Badge, Button, EmptyState } from "../ui/ui";

function PlayerChip({ player, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex w-full items-center gap-1 rounded-lg border border-white/10 bg-gray-800 px-2 py-1 text-sm ${
        isDragging ? "z-20 opacity-80" : ""
      } ${selected ? "ring-2 ring-green-400" : ""}`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(player.id);
        }}
        className="min-w-0 flex-1 truncate text-left font-semibold text-white"
        aria-label={`Selecionar ${player.name || "jogador"}`}
      >
        {player.name || "Sem nome"}
      </button>
      <button
        type="button"
        {...listeners}
        {...attributes}
        onClick={(event) => event.stopPropagation()}
        className="shrink-0 cursor-grab touch-none rounded-md p-0.5 text-gray-400 hover:text-white active:cursor-grabbing"
        aria-label={`Arrastar ${player.name || "jogador"}`}
      >
        <Icon name="drag_indicator" size={18} />
      </button>
    </div>
  );
}

function SeatCard({
  seat,
  player,
  isDealer,
  selectedId,
  onSeatClick,
  onSelectPlayer,
  onToggleDealer,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `seat-${seat}` });

  const cardClass = isDealer
    ? "border-amber-400/60 bg-amber-500/10 ring-1 ring-amber-400/30"
    : isOver
      ? "border-green-400/70 bg-green-500/10"
      : "border-white/10 bg-gray-900";

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSeatClick(seat)}
      className={`min-h-20 cursor-pointer rounded-xl border p-2 transition-colors ${cardClass}`}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className={`text-xs font-semibold ${isDealer ? "text-amber-200" : "text-gray-400"}`}>
          Assento {seat}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleDealer(seat);
          }}
          disabled={!player}
          className={`h-9 w-9 rounded-full text-xs font-bold transition-colors ${
            isDealer
              ? "bg-amber-400 text-amber-950 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]"
              : player
                ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                : "cursor-not-allowed bg-gray-900 text-gray-600"
          }`}
          aria-label={isDealer ? `Remover dealer do assento ${seat}` : `Definir dealer no assento ${seat}`}
          aria-pressed={isDealer}
          title="Dealer / botão"
        >
          D
        </button>
      </div>

      {player ? (
        <PlayerChip
          player={player}
          selected={selectedId === player.id}
          onSelect={onSelectPlayer}
        />
      ) : (
        <div className="flex h-10 items-center justify-center text-xs text-gray-400">Vazio</div>
      )}

      {isDealer && (
        <div className="mt-1 rounded-md bg-amber-400 px-1 py-0.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-amber-950">
          Dealer
        </div>
      )}
    </div>
  );
}

export default function SeatMap() {
  const {
    players,
    seatCount,
    dealerSeat,
    unseated,
    sortearPosicoes,
    sortearDealer,
    setDealerSeat,
    swapSeats,
    placePlayer,
  } = useSessionContext();

  const [selectedId, setSelectedId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const playerAtSeat = (seat) => players.find((player) => player.seat === seat) ?? null;

  const handleSelectPlayer = (playerId) => {
    setSelectedId((current) => (current === playerId ? null : playerId));
  };

  const handleSeatClick = (seat) => {
    if (selectedId) {
      placePlayer(selectedId, seat);
      setSelectedId(null);
      return;
    }

    const player = playerAtSeat(seat);
    if (player) setSelectedId(player.id);
  };

  const handleToggleDealer = (seat) => {
    setDealerSeat(dealerSeat === seat ? null : seat);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over) return;

    const seat = Number(String(over.id).replace("seat-", ""));
    if (!Number.isInteger(seat) || seat < 1) return;

    const player = players.find((item) => item.id === active.id);
    if (!player) return;

    if (player.seat) swapSeats(player.seat, seat);
    else placePlayer(player.id, seat);
  };

  if (players.length === 0) {
    return (
      <EmptyState
        icon="table_restaurant"
        title="Mesa vazia"
        description="Cadastre os jogadores na aba Jogadores para sortear as posições."
      />
    );
  }

  const seats = Array.from({ length: Math.max(seatCount, players.length) }, (_, index) => index + 1);
  const dealerPlayer = players.find((player) => player.seat === dealerSeat) ?? null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button icon="shuffle" onClick={sortearPosicoes}>
          Sortear posições
        </Button>
        <Button variant="amber" icon="casino" onClick={sortearDealer}>
          Sortear dealer
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm">
        <Badge tone="amber">Dealer</Badge>
        <div className="flex items-center gap-3">
          {dealerSeat ? (
            <span className="font-semibold text-amber-200">
              Assento {dealerSeat}
              {dealerPlayer ? ` · ${dealerPlayer.name || "Sem nome"}` : " · vazio"}
            </span>
          ) : (
            <span className="text-gray-400">não sorteado</span>
          )}
          {dealerSeat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDealerSeat(null)}
              className="text-amber-200 hover:bg-amber-500/10"
            >
              Remover
            </Button>
          )}
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-gray-400">
        O assento em âmbar é o dealer. Arraste pelo ícone de alça ou toque em um jogador e
        depois no assento para trocar. Use o botão D para definir ou trocar o dealer.
      </p>

      {unseated.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-2">
          <div className="mb-1 px-1 text-xs font-semibold text-amber-200">Sem assento</div>
          <div className="flex flex-wrap gap-2">
            {unseated.map((player) => (
              <div key={player.id} className="w-40">
                <PlayerChip
                  player={player}
                  selected={selectedId === player.id}
                  onSelect={handleSelectPlayer}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {seats.map((seat) => (
            <SeatCard
              key={seat}
              seat={seat}
              player={playerAtSeat(seat)}
              isDealer={dealerSeat === seat}
              selectedId={selectedId}
              onSeatClick={handleSeatClick}
              onSelectPlayer={handleSelectPlayer}
              onToggleDealer={handleToggleDealer}
            />
          ))}
        </div>
      </DndContext>

      <p className="mt-3 text-center text-xs text-gray-400">
        Assentos 1 a {seats.length} no sentido horário da mesa.
      </p>
    </div>
  );
}
