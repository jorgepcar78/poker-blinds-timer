// src/pages/MenuPage.jsx

import React from "react";
import { Link } from "react-router-dom";
import { useSessionContext } from "../context/SessionContext";
import { useTournamentContext } from "../context/TournamentContext";
import { LEVEL_PRESETS } from "../store/tournamentStore";
import { formatBrl } from "../domain/money";
import Icon from "../components/ui/Icon";
import { Badge, Card, PageHeader, PageShell } from "../components/ui/ui";
import { focusRing } from "../components/ui/styles";

function sameLevels(a, b) {
  return (
    a.length === b.length &&
    a.every(
      (level, index) =>
        level.smallBlind === b[index].smallBlind &&
        level.bigBlind === b[index].bigBlind &&
        level.ante === b[index].ante &&
        level.duration === b[index].duration
    )
  );
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function HubCard({ to, icon, title, subtitle, meta, titleExtra }) {
  return (
    <Card
      as={Link}
      to={to}
      className={`group flex min-h-24 items-center gap-4 transition-colors hover:border-white/20 hover:bg-gray-800/80 ${focusRing}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gray-300 ring-1 ring-inset ring-white/10 transition-colors group-hover:text-white">
        <Icon name={icon} size={24} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-white">{title}</span>
          {titleExtra}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-sm leading-snug text-gray-400">{subtitle}</span>
        )}
        {meta && <span className="mt-1 block text-xs text-gray-400">{meta}</span>}
      </span>

      <Icon
        name="chevron_right"
        size={20}
        className="shrink-0 text-gray-500 transition-colors group-hover:text-gray-300"
      />
    </Card>
  );
}

export default function MenuPage() {
  const { session, players, settlement, liveStatus } = useSessionContext();
  const { levels } = useTournamentContext();

  const liveActive = Boolean(session.live?.active);
  const liveError = liveActive && liveStatus === "error";
  const preset = LEVEL_PRESETS.find((item) => sameLevels(item.levels, levels));
  const presetLabel = preset ? preset.name.split(" · ")[0] : "Personalizada";
  const totalMinutes = levels.reduce((sum, level) => sum + (Number(level.duration) || 0), 0);
  const durationLabel = formatDuration(totalMinutes);
  const playerLabel =
    players.length === 1 ? "1 jogador" : `${players.length} jogadores`;

  const liveChip = liveActive ? (
    <Badge tone={liveError ? "amber" : "green"}>{liveError ? "Sem conexão" : "Ao vivo"}</Badge>
  ) : null;

  return (
    <PageShell>
      <PageHeader backTo="/" backLabel="Timer" title="Menu" />

      <nav aria-label="Menu principal" className="space-y-3">
        <HubCard
          to="/session"
          icon="playing_cards"
          title="Torneio"
          subtitle={session.name && session.name !== "Torneio" ? session.name : null}
          titleExtra={liveChip}
          meta={
            players.length === 0
              ? "Nenhum jogador cadastrado — comece aqui"
              : `${playerLabel} · Pote ${formatBrl(settlement.pool.poolCents)}`
          }
        />

        <HubCard
          to="/settings"
          icon="settings"
          title="Configurações"
          subtitle="Blinds, som, instalação e diagnóstico"
          meta={`${presetLabel} · ${levels.length} níveis · ${durationLabel}`}
        />
      </nav>

      <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
        O timer continua rodando enquanto você navega.
      </p>
    </PageShell>
  );
}
