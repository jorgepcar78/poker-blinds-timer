// src/components/session/SessionConfigCard.jsx

import React from "react";
import { formatBrl } from "../../domain/money";
import { Alert, Card, Field, SectionTitle } from "../ui/ui";
import { inputClass } from "../ui/styles";

export default function SessionConfigCard({ config, players, onChange, hideHeader = false }) {
  const overCap = players.filter((player) => player.rebuys > config.maxRebuys);
  const Wrapper = hideHeader ? "div" : Card;

  const moneyChange = (field) => (event) => {
    const cents = Math.max(0, Math.round((Number(event.target.value) || 0) * 100));
    onChange({ [field]: cents });
  };

  const chipsChange = (field) => (event) => {
    const chips = Math.max(0, Math.round(Number(event.target.value) || 0));
    onChange({ [field]: chips });
  };

  const intChange = (field, min, max) => (event) => {
    const value = Math.max(min, Math.min(max, Math.round(Number(event.target.value) || min)));
    onChange({ [field]: value });
  };

  return (
    <Wrapper>
      {!hideHeader && (
        <SectionTitle meta={`Rateio: ${formatBrl(config.venueCents + config.snacksCents)}`}>
          Regras do torneio
        </SectionTitle>
      )}

      <div className={`grid grid-cols-2 gap-3 ${hideHeader ? "" : "mt-3"}`}>
        <Field label="Buy-in" suffix="R$">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={config.buyInCents / 100}
            onChange={moneyChange("buyInCents")}
            className={inputClass}
          />
        </Field>

        <Field label="Fichas do buy-in" suffix="fichas">
          <input
            type="number"
            min={0}
            step="1000"
            inputMode="numeric"
            value={config.buyInChips}
            onChange={chipsChange("buyInChips")}
            className={inputClass}
          />
        </Field>

        <Field label="Rebuy" suffix="R$">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={config.rebuyCents / 100}
            onChange={moneyChange("rebuyCents")}
            className={inputClass}
          />
        </Field>

        <Field label="Fichas do rebuy" suffix="fichas">
          <input
            type="number"
            min={0}
            step="1000"
            inputMode="numeric"
            value={config.rebuyChips}
            onChange={chipsChange("rebuyChips")}
            className={inputClass}
          />
        </Field>

        <Field label="Máx. rebuys" suffix="por jogador">
          <input
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            value={config.maxRebuys}
            onChange={intChange("maxRebuys", 0, 20)}
            className={inputClass}
          />
        </Field>

        <Field label="Premiados" suffix="pessoas">
          <input
            type="number"
            min={1}
            max={20}
            inputMode="numeric"
            value={config.paidPlaces}
            onChange={intChange("paidPlaces", 1, 20)}
            className={inputClass}
          />
        </Field>

        <Field label="Salão" suffix="R$">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={config.venueCents / 100}
            onChange={moneyChange("venueCents")}
            className={inputClass}
          />
        </Field>

        <Field label="Snacks" suffix="R$">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={config.snacksCents / 100}
            onChange={moneyChange("snacksCents")}
            className={inputClass}
          />
        </Field>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        O máximo de rebuys pode ser aumentado durante o jogo. Se diminuir, os rebuys já
        lançados são mantidos e sinalizados.
      </p>

      {overCap.length > 0 && (
        <Alert tone="warning" className="mt-2 text-xs">
          {overCap.length === 1
            ? `${overCap[0].name || "Um jogador"} tem mais rebuys que o máximo atual.`
            : `${overCap.length} jogadores têm mais rebuys que o máximo atual.`}
        </Alert>
      )}
    </Wrapper>
  );
}
