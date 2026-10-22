// src/pages/SessionPage.jsx

import React, { useState } from "react";
import { useSessionContext } from "../context/SessionContext";
import { formatBrl, formatChips } from "../domain/money";
import { deleteLiveSession } from "../live/liveApi";
import PlayersTab from "../components/session/PlayersTab";
import SeatMap from "../components/session/SeatMap";
import SettlementTab from "../components/session/SettlementTab";
import LiveShareCard from "../components/session/LiveShareCard";
import {
  Badge,
  Button,
  Field,
  PageHeader,
  PageShell,
  Tabs,
} from "../components/ui/ui";
import { focusRing } from "../components/ui/styles";

const TABS = [
  { id: "players", label: "Jogadores" },
  { id: "table", label: "Mesa" },
  { id: "settlement", label: "Acerto" },
  { id: "live", label: "Link" },
];

export default function SessionPage() {
  const {
    session,
    players,
    settlement,
    renameSession,
    startNewSession,
    liveStatus,
  } = useSessionContext();
  const [tab, setTab] = useState("players");

  const playerLabel = players.length === 1 ? "1 jogador" : `${players.length} jogadores`;
  const liveError = Boolean(session.live?.active && liveStatus === "error");

  const handleNewSession = async () => {
    const confirmed = window.confirm(
      "Iniciar um novo torneio? As regras e os nomes atuais serão mantidos; rebuys, assentos, premiados e o link ao vivo serão zerados."
    );

    if (!confirmed) return;

    if (session.live?.active) {
      try {
        await deleteLiveSession(session.live.id, session.live.hostToken);
      } catch (error) {
        console.warn("Could not stop live session:", error);
      }
    }

    startNewSession();
    setTab("players");
  };

  return (
    <PageShell>
      <PageHeader
        backTo="/menu"
        backLabel="Menu"
        title="Torneio"
        action={
          <Button variant="secondary" size="sm" icon="add" onClick={handleNewSession}>
            Novo torneio
          </Button>
        }
      />

      <Field label="Nome do torneio" htmlFor="session-name">
        <input
          id="session-name"
          type="text"
          value={session.name}
          onChange={(event) => renameSession(event.target.value)}
          className={`min-h-11 w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-lg font-semibold text-white transition-colors hover:border-white/20 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 ${focusRing}`}
        />
      </Field>

      <div className="my-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span className="tabular-nums">{playerLabel}</span>
        <span className="tabular-nums">Pote {formatBrl(settlement.pool.poolCents)}</span>
        <span className="tabular-nums">{formatChips(settlement.pool.chipsInPlay)} fichas</span>
        <span className="tabular-nums">Rateio {formatBrl(settlement.rateio.totalCents)}</span>
        {session.live?.active && (
          <Badge tone={liveError ? "amber" : "green"}>
            {liveError ? "Sem conexão" : "Ao vivo"}
          </Badge>
        )}
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Seções do torneio" />

      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className="mt-4 focus:outline-none"
      >
        {tab === "players" && <PlayersTab />}
        {tab === "table" && <SeatMap />}
        {tab === "settlement" && <SettlementTab />}
        {tab === "live" && <LiveShareCard />}
      </div>
    </PageShell>
  );
}
