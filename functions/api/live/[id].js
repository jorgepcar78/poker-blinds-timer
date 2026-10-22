// functions/api/live/[id].js

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

async function getRow(env, id) {
  return env.DB.prepare("SELECT * FROM live_sessions WHERE id = ?").bind(id).first();
}

function checkToken(request, row) {
  const token = request.headers.get("x-host-token");
  return Boolean(token) && token === row.host_token;
}

export async function onRequestGet({ params, env }) {
  if (!env.DB) return json({ error: "Banco D1 não configurado." }, 500);

  try {
    const row = await getRow(env, params.id);
    if (!row) return json({ error: "Link não encontrado." }, 404);

    const now = Date.now();
    if (row.expires_at <= now) return json({ error: "Link expirado." }, 404);

    let payload;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      return json({ error: "Link inválido." }, 500);
    }

    return json({ payload, updatedAt: row.updated_at, serverNow: now });
  } catch (error) {
    console.error("Could not read live session:", error);
    return json({ error: "Não foi possível ler o link." }, 500);
  }
}

export async function onRequestPut({ request, params, env }) {
  if (!env.DB) return json({ error: "Banco D1 não configurado." }, 500);

  try {
    const row = await getRow(env, params.id);
    if (!row) return json({ error: "Link não encontrado." }, 404);
    if (!checkToken(request, row)) return json({ error: "Sem permissão." }, 403);

    const input = await request.json();
    const payload = sanitizePayload(input);
    if (!payload) return json({ error: "Payload inválido." }, 400);

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    await env.DB
      .prepare(
        "UPDATE live_sessions SET payload = ?, updated_at = ?, expires_at = ? WHERE id = ?"
      )
      .bind(JSON.stringify(payload), now, expiresAt, params.id)
      .run();

    return json({ ok: true, updatedAt: now });
  } catch (error) {
    console.error("Could not update live session:", error);
    return json({ error: "Não foi possível atualizar o link." }, 500);
  }
}

export async function onRequestDelete({ request, params, env }) {
  if (!env.DB) return json({ error: "Banco D1 não configurado." }, 500);

  try {
    const row = await getRow(env, params.id);
    if (!row) return json({ ok: true });
    if (!checkToken(request, row)) return json({ error: "Sem permissão." }, 403);

    await env.DB.prepare("DELETE FROM live_sessions WHERE id = ?").bind(params.id).run();

    return json({ ok: true });
  } catch (error) {
    console.error("Could not delete live session:", error);
    return json({ error: "Não foi possível encerrar o link." }, 500);
  }
}
