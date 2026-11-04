import test from "node:test";
import assert from "node:assert/strict";
import { formatBrl, formatBrlWhole, formatPerPerson, parseBrlToCents, parseChips } from "../src/domain/money.js";

test("parseBrlToCents accepts common BRL formats", () => {
  assert.equal(parseBrlToCents("R$ 1.234,56"), 123456);
  assert.equal(parseBrlToCents("180"), 18000);
  assert.equal(parseBrlToCents("180,5"), 18050);
  assert.equal(parseBrlToCents("180.50"), 18050);
  assert.equal(parseBrlToCents("1.234"), 123400);
  assert.equal(parseBrlToCents(40), 4000);
});

test("parseBrlToCents rejects invalid values", () => {
  assert.equal(parseBrlToCents(""), null);
  assert.equal(parseBrlToCents("abc"), null);
  assert.equal(parseBrlToCents("-5"), null);
  assert.equal(parseBrlToCents("1,234"), null);
  assert.equal(parseBrlToCents("1,2345"), null);
});

test("parseChips accepts thousands and rejects decimals", () => {
  assert.equal(parseChips("120.000"), 120000);
  assert.equal(parseChips("120,000"), 120000);
  assert.equal(parseChips("120000"), 120000);
  assert.equal(parseChips(8000), 8000);
  assert.equal(parseChips("120,5"), null);
  assert.equal(parseChips("12.34"), null);
});

test("formatBrl formats cents", () => {
  assert.equal(formatBrl(123456).replace(/\u00a0/g, " "), "R$ 1.234,56");
  assert.equal(formatBrl(0).replace(/\u00a0/g, " "), "R$ 0,00");
});

test("formatBrlWhole hides cents only when the value is round", () => {
  assert.equal(formatBrlWhole(21300).replace(/\u00a0/g, " "), "R$ 213");
  assert.equal(formatBrlWhole(10750).replace(/\u00a0/g, " "), "R$ 107,50");
  assert.equal(formatBrlWhole(0).replace(/\u00a0/g, " "), "R$ 0");
});

test("formatPerPerson shows exact and ranged shares", () => {
  assert.equal(formatPerPerson(10000, 8).replace(/\u00a0/g, " "), "R$ 12,50 cada");
  assert.equal(formatPerPerson(9000, 6).replace(/\u00a0/g, " "), "R$ 15,00 cada");
  assert.equal(
    formatPerPerson(10000, 3).replace(/\u00a0/g, " "),
    "R$ 33,33 a R$ 33,34 cada"
  );
  assert.equal(formatPerPerson(10000, 0), "sem participantes");
});
