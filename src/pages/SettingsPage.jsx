// src/pages/SettingsPage.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">CONFIGURAÇÕES</h1>
        <button
          className="mt-4 px-6 py-3 bg-gray-800 rounded-lg text-lg"
          onClick={() => navigate('/')}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;
