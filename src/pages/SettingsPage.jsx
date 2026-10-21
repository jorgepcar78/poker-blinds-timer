import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import { DEFAULT_LEVELS, LEVEL_PRESETS } from "../store/tournamentStore";
import { getFullscreenApi, isIos, isStandalone } from "../utils/platform";

const MAX_DURATION_MINUTES = 600;

function cloneLevels(levels) {
  return levels.map((level) => ({ ...level }));
}

function SettingsPage() {
  const navigate = useNavigate();
  const { levels: savedLevels, updateLevels, testSound, getAudioState } = useTournamentContext();

  const [levels, setLevels] = useState(() => cloneLevels(savedLevels));
  const [batchDuration, setBatchDuration] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [soundStatus, setSoundStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");

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
    window.setTimeout(() => navigate("/"), 600);
  };

  return (
    <div className="min-h-dvh bg-black p-4 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">CONFIGURAÇÕES</h1>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">
            Voltar
          </Link>
        </div>

        {/* Presets */}
        <div className="mb-4 rounded bg-gray-800 p-4">
          <h2 className="mb-2 text-sm font-medium">Estruturas prontas</h2>
          <div className="flex flex-wrap gap-2">
            {LEVEL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            A estrutura escolhida substitui a lista abaixo. Salve para aplicar.
          </p>
        </div>

        {/* Sound test */}
        <div className="mb-4 rounded bg-gray-800 p-4">
          <h2 className="mb-2 text-sm font-medium">Som</h2>
          <button
            type="button"
            onClick={handleTestSound}
            className="rounded bg-indigo-600 px-4 py-2 font-bold hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Testar som
          </button>
          <p className="mt-2 text-xs text-gray-400">
            No iPhone, o áudio só é liberado depois do primeiro toque na tela.
          </p>
          {soundStatus && (
            <p
              role="status"
              className={`mt-2 text-xs ${soundStatus.ok ? "text-green-300" : "text-red-300"}`}
            >
              {soundStatus.message}
            </p>
          )}
        </div>

        {/* Batch duration */}
        <div className="mb-4 rounded bg-gray-800 p-4">
          <label htmlFor="batch-duration" className="mb-1 block text-sm font-medium">
            Definir duração (minutos) para TODOS os níveis
          </label>
          <div className="flex gap-2">
            <input
              id="batch-duration"
              type="number"
              min={1}
              max={MAX_DURATION_MINUTES}
              inputMode="numeric"
              value={batchDuration}
              onChange={(event) => setBatchDuration(event.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
            />
            <button
              type="button"
              onClick={applyBatchDuration}
              className="shrink-0 rounded bg-indigo-600 px-4 py-2 font-bold hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* Levels list */}
        {levels.map((level, index) => (
          <div key={index} className="mb-4 rounded-lg bg-gray-800 p-4">
            <h2 className="mb-2 text-xl font-semibold">Nível {index + 1}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Small Blind</label>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={level.smallBlind}
                  onChange={(event) => updateLevelField(index, "smallBlind", event.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Big Blind</label>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={level.bigBlind}
                  onChange={(event) => updateLevelField(index, "bigBlind", event.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Ante</label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={level.ante}
                  onChange={(event) => updateLevelField(index, "ante", event.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Duração (min)</label>
                <input
                  type="number"
                  min={1}
                  max={MAX_DURATION_MINUTES}
                  inputMode="numeric"
                  value={level.duration}
                  onChange={(event) => updateLevelField(index, "duration", event.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRemoveLevel(index)}
              className="mt-3 w-full rounded bg-red-600 px-4 py-2 font-bold hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Remover
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddLevel}
          className="mb-3 w-full rounded bg-green-600 px-4 py-3 font-bold hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          + Adicionar nível
        </button>

        <button
          type="button"
          onClick={() => {
            setLevels(cloneLevels(DEFAULT_LEVELS));
            setError("");
            setSaved(false);
          }}
          className="mb-6 w-full rounded bg-gray-800 px-4 py-2 text-sm font-semibold hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Restaurar estrutura padrão
        </button>

        {error && (
          <p role="alert" className="mb-3 rounded bg-red-900/60 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {saved && (
          <p role="status" className="mb-3 rounded bg-green-900/60 px-3 py-2 text-sm text-green-200">
            Configurações salvas!
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded bg-blue-600 px-4 py-3 font-bold hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Salvar configurações
        </button>

        <details
          className="mt-6 rounded bg-gray-800 p-4 text-sm"
          onToggle={(event) => {
            if (event.currentTarget.open) setDiagnostics(buildDiagnostics());
          }}
        >
          <summary className="cursor-pointer font-medium">Diagnóstico</summary>
          <p className="mt-2 text-xs text-gray-400">
            Use no iPhone para conferir o que está ativo neste navegador.
          </p>

          {diagnostics.length > 0 && (
            <dl className="mt-3 space-y-1">
              {diagnostics.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-xs">
                  <dt className="shrink-0 text-gray-400">{label}</dt>
                  <dd className="break-all text-right text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="mt-3 rounded bg-gray-700 px-3 py-2 text-xs font-semibold hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Copiar diagnóstico
          </button>
          {copyStatus && (
            <span role="status" className="ml-2 text-xs text-green-300">
              {copyStatus}
            </span>
          )}
        </details>
      </div>
    </div>
  );
}

export default SettingsPage;
