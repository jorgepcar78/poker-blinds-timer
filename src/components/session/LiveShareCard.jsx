// src/components/session/LiveShareCard.jsx

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useSessionContext } from "../../context/SessionContext";
import { useTournamentContext } from "../../context/TournamentContext";
import { createLiveSession, deleteLiveSession } from "../../live/liveApi";
import { buildLivePayload } from "../../live/livePayload";
import { Alert, Badge, Button, Card, SectionTitle } from "../ui/ui";

export default function LiveShareCard() {
  const {
    session,
    setLive,
    liveStatus,
    liveError,
    setLiveStatus,
    setLiveError,
  } = useSessionContext();
  const { levels, currentLevelIndex, remainingTime, isRunning, isFinished } =
    useTournamentContext();

  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const live = session.live;
  const liveUrl = live?.id ? `${window.location.origin}/live/${live.id}` : "";
  const errorMessage = localError || liveError;

  const handleStart = async () => {
    setBusy(true);
    setLocalError("");
    setLiveError("");

    try {
      const payload = buildLivePayload({
        name: session.name,
        levels,
        currentLevelIndex,
        remainingTime,
        isRunning,
        isFinished,
      });
      const created = await createLiveSession(payload);

      setLive({ id: created.id, hostToken: created.hostToken });
      setLiveStatus("live");
    } catch (error) {
      setLocalError(error.message);
      setLiveStatus("error");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (!live) return;

    setBusy(true);

    try {
      await deleteLiveSession(live.id, live.hostToken);
    } catch (error) {
      console.warn("Could not delete live session:", error);
    }

    setLive(null);
    setLiveStatus("idle");
    setLocalError("");
    setBusy(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopyStatus("Link copiado!");
    } catch {
      setCopyStatus("Não foi possível copiar.");
    }

    window.setTimeout(() => setCopyStatus(""), 2000);
  };

  return (
    <Card>
      <SectionTitle
        meta={
          live?.active ? (
            <Badge tone={liveStatus === "error" ? "amber" : "green"}>
              {liveStatus === "error" ? "Sem conexão" : "Ao vivo"}
            </Badge>
          ) : null
        }
      >
        Link ao vivo
      </SectionTitle>
      <p className="mt-2 text-xs leading-relaxed text-gray-400">
        Cada mesa abre este link para acompanhar o nível e o tempo. O link mostra só o
        timer — sem jogadores, pote ou valores.
      </p>

      {!live?.active ? (
        <>
          <Button
            icon="link"
            onClick={handleStart}
            disabled={busy}
            className="mt-3 w-full"
          >
            {busy ? "Criando link…" : "Criar link ao vivo"}
          </Button>

          <p className="mt-2 text-xs leading-relaxed text-gray-400">
            O celular do host precisa estar online para publicar as atualizações.
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-end">
            <Button
              variant="dangerGhost"
              size="sm"
              onClick={handleStop}
              disabled={busy}
            >
              Encerrar link
            </Button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              readOnly
              value={liveUrl}
              onFocus={(event) => event.target.select()}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-gray-950 px-3 py-2 font-mono text-xs text-gray-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20"
              aria-label="Link ao vivo"
            />
            <Button
              variant="secondary"
              icon="content_copy"
              onClick={handleCopy}
              className="shrink-0"
            >
              Copiar
            </Button>
          </div>

          <div className="mt-3 flex justify-center">
            <div
              className="inline-block rounded-xl bg-white p-3"
              role="img"
              aria-label="QR code para abrir o link ao vivo"
            >
              <QRCodeSVG
                value={liveUrl}
                size={192}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <Button
              as="a"
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              size="sm"
              icon="open_in_new"
            >
              Abrir link
            </Button>
            {copyStatus && (
              <span role="status" className="text-gray-400">
                {copyStatus}
              </span>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-gray-400">
            Mostre o QR para cada mesa escanear. Se o host ficar sem internet, as mesas
            continuam contando pelo último estado, mas não veem pausas ou trocas de nível.
          </p>
        </>
      )}

      {errorMessage && (
        <Alert tone="error" className="mt-3 text-xs">
          {errorMessage}
        </Alert>
      )}
    </Card>
  );
}
