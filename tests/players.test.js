import test from "node:test";
import assert from "node:assert/strict";
import { parsePlayerNames } from "../src/domain/players.js";

test("parses names by lines, commas and semicolons", () => {
  assert.deepEqual(parsePlayerNames("Ana\nBruno\n\nCarla, Diego;"), [
    "Ana",
    "Bruno",
    "Carla",
    "Diego",
  ]);
});

test("strips list markers and collapses spaces", () => {
  assert.deepEqual(parsePlayerNames("1. Ana\n-   Bruno\n• Carla\n2) Diego"), [
    "Ana",
    "Bruno",
    "Carla",
    "Diego",
  ]);
});

test("keeps duplicates and truncates long names", () => {
  const longName = "a".repeat(45);

  assert.deepEqual(parsePlayerNames(`Ana\nAna\n${longName}`), [
    "Ana",
    "Ana",
    "a".repeat(40),
  ]);
});

test("ignores empty input", () => {
  assert.deepEqual(parsePlayerNames(""), []);
  assert.deepEqual(parsePlayerNames("  \n , ; "), []);
});
