import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function SettingsPage() {
  const navigate = useNavigate();
  const defaultLevels = [
    { smallBlind: 50, bigBlind: 100, ante: 0, duration: 10 },
    { smallBlind: 100, bigBlind: 200, ante: 0, duration: 10 },
    { smallBlind: 150, bigBlind: 300, ante: 0, duration: 10 },
    { smallBlind: 200, bigBlind: 400, ante: 0, duration: 10 },
    { smallBlind: 300, bigBlind: 600, ante: 0, duration: 10 },
    { smallBlind: 400, bigBlind: 800, ante: 0, duration: 10 },
    { smallBlind: 600, bigBlind: 1200, ante: 0, duration: 10 },
    { smallBlind: 1000, bigBlind: 2000, ante: 0, duration: 10 },
    { smallBlind: 1500, bigBlind: 3000, ante: 0, duration: 10 }
  ];
  const [levels, setLevels] = useState(() => {
  const saved = localStorage.getItem("tournament-levels");
  return saved ? JSON.parse(saved) : defaultLevels;
});
const [batchDuration, setBatchDuration] = useState('');

  const handleAddLevel = () => {
    setLevels([...levels, { smallBlind: 0, bigBlind: 0, ante: 0, duration: 20 }]);
  };

  const handleRemoveLevel = (index) => {
    const newLevels = [...levels];
    newLevels.splice(index, 1);
    setLevels(newLevels);
  };

  const handleSave = () => {
    localStorage.setItem(
      "tournament-levels",
      JSON.stringify(levels)
    );
    alert("Configurações salvas!");
    navigate('/');
  };

  return (
    <div className="h-screen bg-black text-white p-4 overflow-y-auto">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">CONFIGURAÇÕES</h1>
          {/* Batch duration input */}
          <div className="mb-4 p-4 bg-gray-800 rounded">
            <label className="block text-sm font-medium mb-1">Definir Duração (minutos) para TODOS os níveis</label>
            <input
              type="number"
              value={batchDuration || ''}
              onChange={(e) => setBatchDuration(parseInt(e.target.value) || '')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white mb-2"
            />
            <button
              onClick={() => {
                if (batchDuration) {
                  const newLevels = levels.map(l => ({ ...l, duration: batchDuration }));
                  setLevels(newLevels);
                }
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              Aplicar a todos
            </button>
          </div>

        {/* Levels List */}
        {levels.map((level, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold mb-2">Nível {index + 1}</h2>
            <div className="grid grid-cols-1 gap-4">
              {/* Small Blind */}
              <div>
                <label className="block text-sm font-medium mb-1">Small Blind</label>
                <input
                  type="number"
                  value={level.smallBlind}
                  onChange={(e) => {
                    const newLevels = [...levels];
                    newLevels[index].smallBlind = parseInt(e.target.value) || 0;
                    setLevels(newLevels);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              {/* Big Blind */}
              <div>
                <label className="block text-sm font-medium mb-1">Big Blind</label>
                <input
                  type="number"
                  value={level.bigBlind}
                  onChange={(e) => {
                    const newLevels = [...levels];
                    newLevels[index].bigBlind = parseInt(e.target.value) || 0;
                    setLevels(newLevels);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              {/* Ante */}
              <div>
                <label className="block text-sm font-medium mb-1">Ante</label>
                <input
                  type="number"
                  value={level.ante}
                  onChange={(e) => {
                    const newLevels = [...levels];
                    newLevels[index].ante = parseInt(e.target.value) || 0;
                    setLevels(newLevels);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  value={level.duration}
                  onChange={(e) => {
                    const newLevels = [...levels];
                    newLevels[index].duration = parseInt(e.target.value) || 20;
                    setLevels(newLevels);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveLevel(index)}
                className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Remover
              </button>
            </div>
          </div>
        ))}

        {/* Add Level Button */}
        <button
          onClick={handleAddLevel}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded mb-6"
        >
          + Adicionar nível
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded"
        >
          Salvar configurações
        </button>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;