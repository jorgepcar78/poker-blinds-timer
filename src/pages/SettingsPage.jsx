import React, { useState } from "react";
import { useTournamentContext } from "../context/TournamentContext";
import { DEFAULT_LEVELS, LEVEL_PRESETS } from "../store/tournamentStore";
import { getFullscreenApi, isIos, isStandalone } from "../utils/platform";
import useInstallPrompt from "../hooks/useInstallPrompt";
import InstallAppCard from "../components/InstallAppCard";
import Icon from "../components/ui/Icon";
import {
  Accordion,
  Alert,
  Button,
  Card,
  Field,
  IconButton,
  PageHeader,
  PageShell,
  SectionTitle,
  Tile,
} from "../components/ui/ui";
import { focusRing, inputClass } from "../components/ui/styles";

const MAX_DURATION_MINUTES = 600;

function cloneLevels(levels) {
  return levels.map((level) => ({ ...level }));
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function SettingsPage() {
  const { levels: savedLevels, updateLevels, testSound, getAudioState } = useTournamentContext();
  const installState = useInstallPrompt();

  const [levels, setLevels] = useState(() => cloneLevels(savedLevels));
  const [batchDuration, setBatchDuration] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [soundStatus, setSoundStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  const totalMinutes = levels.reduce((sum, level) => sum + (Number(level.duration) || 0), 0);
  const durationLabel = formatDuration(totalMinutes);

  const buildDiagnostics = () => {
    const fullscreen = getFullscreenApi();
    const audio = getAudioState();

    return [
      ["Plataforma", isIos() ? "iOS" : "Outro"],
      ["Modo", isStandalone() ? "standalone (instalado)" : "navegador"],
      ["Tela cheia", isIos() ? "não suportada no iOS" : fullscreen.supported ? "API disponível" : "API indisponível"],
      ["Áudio", `${audio.mode} (${audio.contextState})`],
      ["Som carregado", audio.soundLoaded ? "sim" : "não"],
      ["AudioSession", audio.audioSession ? "disponível" : "indisponível"],
      ["Instalação", installState],
      ["Wake Lock", "wakeLock" in navigator ? "disponível" : "indisponível"],
      ["Tela", `${window.screen.width}x${window.screen.height}`],
      ["User agent", navigator.userAgent],
    ];
  };

  const handleTestSound = async () => {
    const played = await testSound();
    setSoundStatus(
      played
        ? { ok: true, message: "Som reproduzido." }
        : { ok: false, message: "Não foi possível reproduzir o som." }
    );
    window.setTimeout(() => setSoundStatus(null), 2500);
  };

  const handleCopyDiagnostics = async () => {
    const text = diagnostics.map(([label, value]) => `${label}: ${value}`).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copiado!");
    } catch {
      setCopyStatus("Não foi possível copiar.");
    }

    window.setTimeout(() => setCopyStatus(""), 2000);
  };

  const updateLevelField = (index, field, rawValue) => {
    const value = Math.max(0, Number.parseInt(rawValue, 10) || 0);
    const nextValue = field === "duration" ? Math.min(MAX_DURATION_MINUTES, value) : value;

    setLevels((prev) =>
      prev.map((level, levelIndex) =>
        levelIndex === index ? { ...level, [field]: nextValue } : level
      )
    );
    setError("");
    setSaved(false);
  };

  const handleAddLevel = () => {
    const lastLevel = levels[levels.length - 1];
    setLevels((prev) => [
      ...prev,
      {
        smallBlind: lastLevel ? lastLevel.smallBlind * 2 : 50,
        bigBlind: lastLevel ? lastLevel.bigBlind * 2 : 100,
        ante: 0,
        duration: lastLevel ? lastLevel.duration : 20,
      },
    ]);
    setError("");
    setSaved(false);
  };

  const handleRemoveLevel = (index) => {
    if (levels.length === 1) {
      setError("É preciso manter pelo menos um nível.");
      return;
    }

    setLevels((prev) => prev.filter((_, levelIndex) => levelIndex !== index));
    setError("");
    setSaved(false);
  };

  const applyPreset = (preset) => {
    if (!window.confirm(`Substituir a estrutura atual por "${preset.name}"?`)) return;

    setLevels(cloneLevels(preset.levels));
    setError("");
    setSaved(false);
  };

  const applyBatchDuration = () => {
    const duration = Number.parseInt(batchDuration, 10);

    if (!Number.isFinite(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
      setError("Informe uma duração entre 1 e 600 minutos.");
      return;
    }

    setLevels((prev) => prev.map((level) => ({ ...level, duration })));
    setBatchDuration("");
    setError("");
    setSaved(false);
  };

  const validateLevels = () => {
    if (levels.some((level) => level.duration < 1)) {
      return "Cada nível precisa de uma duração de pelo menos 1 minuto.";
    }
    if (levels.some((level) => level.smallBlind < 1 || level.bigBlind < level.smallBlind)) {
      return "Confira os blinds: o small blind deve ser pelo menos 1 e o big blind não pode ser menor que ele.";
    }
    return "";
  };

  const handleSave = () => {
    const validationError = validateLevels();

    if (validationError) {
      setError(validationError);
      return;
    }

    updateLevels(levels);
    setError("");
    setSaved(true);
  };

  return (
    <PageShell>
      <PageHeader
        backTo="/menu"
        backLabel="Menu"
        title="Configurações"
        description="Ajuste a estrutura do torneio e o comportamento do app."
      />

      <div className="space-y-3">
        <Accordion
          id="game"
          title="Jogo"
          meta={`${levels.length} níveis · ${durationLabel}`}
          defaultOpen
        >
          <div className="space-y-5">
            <div>
              <SectionTitle>Estruturas prontas</SectionTitle>
              <div className="mt-3 flex flex-wrap gap-2">
                {LEVEL_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                A estrutura escolhida substitui a lista abaixo. Salve para aplicar.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4">
              <Field
                label="Duração para todos os níveis"
                htmlFor="batch-duration"
                suffix="min"
              >
                <div className="flex gap-2">
                  <input
                    id="batch-duration"
                    type="number"
                    min={1}
                    max={MAX_DURATION_MINUTES}
                    inputMode="numeric"
                    value={batchDuration}
                    onChange={(event) => setBatchDuration(event.target.value)}
                    placeholder="Ex.: 15"
                    className={inputClass}
                  />
                  <Button
                    variant="secondary"
                    onClick={applyBatchDuration}
                    className="shrink-0"
                  >
                    Aplicar
                  </Button>
                </div>
              </Field>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Aplica a mesma duração a todos os níveis de uma vez.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4">
              <SectionTitle meta={`${levels.length} níveis`}>Níveis</SectionTitle>

              <div className="mt-3 space-y-2">
                {levels.map((level, index) => (
                  <details
                    key={index}
                    className="group rounded-xl border border-white/10 bg-white/[0.03]"
                  >
                    <summary
                      className={`flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden ${focusRing}`}
                    >
                      <span className="text-sm font-semibold text-white">Nível {index + 1}</span>
                      <span className="min-w-0 flex-1 text-right text-xs leading-snug text-gray-400">
                        {level.smallBlind}/{level.bigBlind}
                        {level.ante > 0 ? ` · ante ${level.ante}` : ""} · {level.duration} min
                      </span>
                      <Icon
                        name="expand_more"
                        size={20}
                        className="text-gray-400 transition-transform group-open:rotate-180"
                      />
                    </summary>

                    <div className="border-t border-white/10 p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Small blind" htmlFor={`level-${index}-small-blind`}>
                          <input
                            id={`level-${index}-small-blind`}
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={level.smallBlind}
                            onChange={(event) =>
                              updateLevelField(index, "smallBlind", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Big blind" htmlFor={`level-${index}-big-blind`}>
                          <input
                            id={`level-${index}-big-blind`}
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={level.bigBlind}
                            onChange={(event) =>
                              updateLevelField(index, "bigBlind", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Ante" htmlFor={`level-${index}-ante`}>
                          <input
                            id={`level-${index}-ante`}
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={level.ante}
                            onChange={(event) =>
                              updateLevelField(index, "ante", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Duração" htmlFor={`level-${index}-duration`} suffix="min">
                          <input
                            id={`level-${index}-duration`}
                            type="number"
                            min={1}
                            max={MAX_DURATION_MINUTES}
                            inputMode="numeric"
                            value={level.duration}
                            onChange={(event) =>
                              updateLevelField(index, "duration", event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                      </div>

                      <Button
                        variant="dangerGhost"
                        size="sm"
                        icon="delete"
                        onClick={() => handleRemoveLevel(index)}
                        className="mt-3 w-full"
                      >
                        Remover nível
                      </Button>
                    </div>
                  </details>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                <Button
                  variant="secondary"
                  icon="add"
                  onClick={handleAddLevel}
                  className="w-full"
                >
                  Adicionar nível
                </Button>
                <Button
                  variant="ghost"
                  icon="restart_alt"
                  onClick={() => {
                    setLevels(cloneLevels(DEFAULT_LEVELS));
                    setError("");
                    setSaved(false);
                  }}
                  className="w-full"
                >
                  Restaurar padrão
                </Button>
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion id="app" title="App" meta="Som, instalação e diagnóstico">
          <div className="grid grid-cols-2 gap-3">
            <Tile icon="volume_up" title="Som">
              <p className="text-xs leading-relaxed text-gray-400">
                Teste o áudio antes de começar.
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon="play_arrow"
                onClick={handleTestSound}
                className="mt-auto w-full"
              >
                Testar
              </Button>
              {soundStatus && (
                <p
                  role="status"
                  className={`mt-2 text-xs ${soundStatus.ok ? "text-green-300" : "text-red-300"}`}
                >
                  {soundStatus.message}
                </p>
              )}
            </Tile>

            <InstallAppCard onShowHelp={() => setInstallHelpOpen((open) => !open)} />
          </div>

          {installHelpOpen && (
            <Card className="mt-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Como instalar</h3>
                <IconButton
                  icon="close"
                  label="Fechar instruções"
                  variant="ghost"
                  onClick={() => setInstallHelpOpen(false)}
                />
              </div>
              <ol className="mt-2 space-y-2 text-xs leading-relaxed text-gray-300">
                <li className="flex gap-2">
                  <span className="font-mono text-gray-400">1.</span>
                  Abra o app no navegador do celular.
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-gray-400">2.</span>
                  Toque em Compartilhar no iPhone ou no menu do navegador no Android.
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-gray-400">3.</span>
                  Escolha “Adicionar à Tela de Início” ou “Instalar app”.
                </li>
              </ol>
            </Card>
          )}

          <details
            className="group mt-4 border-t border-white/10 pt-3"
            onToggle={(event) => {
              if (event.currentTarget.open) setDiagnostics(buildDiagnostics());
            }}
          >
            <summary
              className={`flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-sm font-semibold text-gray-200 [&::-webkit-details-marker]:hidden ${focusRing}`}
            >
              <span>Diagnóstico</span>
              <Icon
                name="expand_more"
                size={20}
                className="text-gray-400 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              Use no iPhone para conferir o que está ativo neste navegador.
            </p>

            {diagnostics.length > 0 && (
              <dl className="mt-3 space-y-1.5">
                {diagnostics.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-white/5 pb-1 text-xs last:border-0"
                  >
                    <dt className="shrink-0 text-gray-400">{label}</dt>
                    <dd className="break-all text-right text-gray-200">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon="content_copy"
                onClick={handleCopyDiagnostics}
              >
                Copiar diagnóstico
              </Button>
              {copyStatus && (
                <span role="status" className="text-xs text-green-300">
                  {copyStatus}
                </span>
              )}
            </div>
          </details>
        </Accordion>
      </div>

      <div
        className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {saved && (
          <p
            role="status"
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-green-300"
          >
            <Icon name="check_circle" size={18} />
            Alterações salvas.
          </p>
        )}
        {error && <Alert tone="error" className="mb-2">{error}</Alert>}
        <Button size="lg" icon="save" onClick={handleSave} className="w-full">
          Salvar alterações
        </Button>
      </div>
    </PageShell>
  );
}

export default SettingsPage;
