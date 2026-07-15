import { describe, it, expect } from "vitest";
import { daysUntil, deriveExerciceYear } from "./dateUtils";

describe("daysUntil", () => {
  it("returns a positive count for a future date", () => {
    expect(daysUntil("2026-07-20", new Date("2026-07-15T12:00:00Z"))).toBe(5);
  });

  it("returns 0 for today", () => {
    expect(daysUntil("2026-07-15", new Date("2026-07-15T23:00:00Z"))).toBe(0);
  });

  it("returns a negative count for a past date", () => {
    expect(daysUntil("2026-07-10", new Date("2026-07-15T00:00:00Z"))).toBe(-5);
  });
});

describe("deriveExerciceYear", () => {
  it("extracts the year from the ex-dividend date when available", () => {
    expect(deriveExerciceYear("2026-07-20", new Date("2026-01-01T00:00:00Z"))).toBe(2026);
  });

  it("falls back to the current year when the date is unknown", () => {
    expect(deriveExerciceYear(null, new Date("2026-01-01T00:00:00Z"))).toBe(2026);
  });
});
