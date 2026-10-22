// src/domain/money.js

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const chipFormatter = new Intl.NumberFormat("pt-BR");

export function formatBrl(cents) {
  const value = Number(cents);
  return brlFormatter.format(Number.isFinite(value) ? value / 100 : 0);
}

export function formatChips(value) {
  const number = Number(value);
  return chipFormatter.format(Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0);
}

export function parseBrlToCents(input) {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  let normalized = raw.replace(/[R$\s]/g, "");

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  } else if (normalized.includes(".")) {
    const parts = normalized.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = normalized.replace(/\./g, "");
    }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

export function parseChips(input) {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.max(0, Math.round(input)) : null;
  }

  const raw = String(input).trim().replace(/\s/g, "");
  if (!raw) return null;

  const plain = /^\d+$/;
  const grouped = /^\d{1,3}([.,]\d{3})+$/;
  if (!plain.test(raw) && !grouped.test(raw)) return null;

  const value = Number(raw.replace(/[.,]/g, ""));
  return Number.isSafeInteger(value) ? value : null;
}
