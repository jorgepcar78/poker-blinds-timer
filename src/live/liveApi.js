// src/live/liveApi.js

const BASE = "/api/live";

async function parseResponse(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Falha na API (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  if (!data) {
    throw new Error("A API do link ao vivo não está disponível.");
  }

  return data;
}

export async function createLiveSession(payload) {
  const response = await fetch(BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response);

  if (!data.id || !data.hostToken) {
    throw new Error("A API não retornou um link válido.");
  }

  return data;
}

export async function updateLiveSession(id, hostToken, payload) {
  const response = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-host-token": hostToken,
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function fetchLiveSession(id) {
  const response = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    headers: { accept: "application/json" },
  });

  return parseResponse(response);
}

export async function deleteLiveSession(id, hostToken) {
  const response = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "x-host-token": hostToken },
  });

  return parseResponse(response);
}
