// src/components/InstallAppCard.jsx

import React, { useState } from "react";
import useInstallPrompt from "../hooks/useInstallPrompt";
import { promptInstall } from "../pwa/installPrompt";
import { isIos, isStandalone } from "../utils/platform";
import { Badge, Button, Tile } from "./ui/ui";

export default function InstallAppCard({ onShowHelp }) {
  const state = useInstallPrompt();
  const [message, setMessage] = useState("");

  const ios = isIos();
  const standalone = isStandalone();
  const installed = state === "installed" || standalone;
  const canPrompt = state === "available" && !ios;

  const handleInstall = async () => {
    const result = await promptInstall();

    if (result.outcome === "accepted") {
      setMessage("Instalação iniciada. O app vai aparecer na tela inicial.");
    } else if (result.outcome === "dismissed") {
      setMessage("Instalação cancelada. Você pode tentar pelo menu do navegador.");
    } else if (result.outcome === "unavailable") {
      setMessage("Use o menu do navegador para instalar o app.");
    } else {
      setMessage("Não foi possível abrir a instalação. Use o menu do navegador.");
    }
  };

  const description = installed
    ? "App instalado neste dispositivo."
    : ios
      ? "Adicione à Tela de Início para abrir em tela cheia."
      : canPrompt
        ? "Instale para abrir sem o navegador."
        : "Use o menu do navegador para instalar.";

  return (
    <Tile icon="install_mobile" title="Instalação">
      <p className="text-xs leading-relaxed text-gray-400">{description}</p>

      <div className="mt-auto pt-3">
        {installed ? (
          <Badge tone="green">Instalado</Badge>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            icon={ios ? "ios_share" : "install_mobile"}
            onClick={ios || !canPrompt ? onShowHelp : handleInstall}
            className="w-full"
          >
            {ios ? "Como instalar" : "Instalar"}
          </Button>
        )}

        {message && (
          <p role="status" className="mt-2 text-[11px] leading-relaxed text-gray-400">
            {message}
          </p>
        )}
      </div>
    </Tile>
  );
}
