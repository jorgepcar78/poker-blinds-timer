// functions/api/live/index.js

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function sanitizePayload(input) {
  if (!input || typeof input !== "object") return null;

  const levels = Array.isArray(input.levels) ? input.levels.slice(0, 100) : null;
  if (!levels || levels.length === 0) return null;

  const cleanLevels = levels.map((level) => ({
    smallBlind: Math.max(0, Math.round(Number(level?.smallBlind) || 0)),
    bigBlind: Math.max(0, Math.round(Number(level?.bigBlind) || 0)),
    ante: Math.max(0, Math.round(Number(level?.ante) || 0)),
    duration: Math.max(0, Math.round(Number(level?.duration) || 0)),
  }));

  const payload = {
    name: String(input.name ?? "Torneio").slice(0, 80),
    levels: cleanLevels,
    currentLevelIndex: Math.max(0, Math.round(Number(input.currentLevelIndex) || 0)),
    remainingTime: Math.max(0, Math.round(Number(input.remainingTime) || 0)),
    isRunning: Boolean(input.isRunning),
    isFinished: Boolean(input.isFinished),
    publishedAt: Number(input.publishedAt) || Date.now(),
  };

  if (JSON.stringify(payload).length > 20000) return null;

  return payload;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Banco D1 não configurado." }, 500);

  try {
    const input = await request.json();
    const payload = sanitizePayload(input);
    if (!payload) return json({ error: "Payload inválido." }, 400);

    const id = crypto.randomUUID().replace(/-/g, "");
    const hostToken = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    await env.DB
      .prepare("DELETE FROM live_sessions WHERE expires_at <= ?")
      .bind(now)
      .run();

    await env.DB
      .prepare(
        "INSERT INTO live_sessions (id, host_token, payload, updated_at, expires_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(id, hostToken, JSON.stringify(payload), now, expiresAt)
      .run();

    return json({ id, hostToken });
  } catch (error) {
    console.error("Could not create live session:", error);
    return json({ error: "Não foi possível criar o link ao vivo." }, 500);
  }
}
