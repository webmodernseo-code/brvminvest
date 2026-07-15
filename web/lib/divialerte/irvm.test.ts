import { describe, it, expect } from "vitest";
import { calculateNetDividend } from "./irvm";

describe("calculateNetDividend", () => {
  it("applies the 10% Côte d'Ivoire rate", () => {
    expect(calculateNetDividend(1000, "ci")).toBe(900);
  });

  it("applies the 5% Bénin rate", () => {
    expect(calculateNetDividend(1000, "bj")).toBe(950);
  });

  it("applies the 12.5% Burkina Faso rate", () => {
    expect(calculateNetDividend(1000, "bf")).toBe(875);
  });

  it("is case-insensitive on the country code", () => {
    expect(calculateNetDividend(1000, "CI")).toBe(900);
  });

  it("returns null for an unsupported country", () => {
    expect(calculateNetDividend(1000, "ne")).toBeNull();
  });

  it("returns null when the country is unknown", () => {
    expect(calculateNetDividend(1000, null)).toBeNull();
  });

  it("returns null when the montant is unknown", () => {
    expect(calculateNetDividend(null, "ci")).toBeNull();
  });
});
