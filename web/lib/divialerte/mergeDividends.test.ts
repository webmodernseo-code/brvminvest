import { describe, it, expect } from "vitest";
import { resolveDividendFields } from "./mergeDividends";

const empty = { montant: null, rendement: null, dateDetachement: null, datePaiement: null };

describe("resolveDividendFields", () => {
  it("prefers Sika for montant/rendement when both sources have it", () => {
    const sika = { ...empty, montant: 100, rendement: 5 };
    const richbourse = { ...empty, montant: 200, rendement: 6 };
    const result = resolveDividendFields(null, sika, richbourse);
    expect(result.montant).toBe(100);
    expect(result.rendement).toBe(5);
  });

  it("falls back to RichBourse montant when Sika has none", () => {
    const richbourse = { ...empty, montant: 200, rendement: 6 };
    const result = resolveDividendFields(null, null, richbourse);
    expect(result.montant).toBe(200);
    expect(result.rendement).toBe(6);
  });

  it("keeps the current value when neither scraped source has montant", () => {
    const current = { ...empty, montant: 50, rendement: 2 };
    const result = resolveDividendFields(current, null, null);
    expect(result.montant).toBe(50);
    expect(result.rendement).toBe(2);
  });

  it("prefers RichBourse for dates when both sources have them", () => {
    const sika = { ...empty, dateDetachement: "2026-07-10", datePaiement: "2026-07-15" };
    const richbourse = { ...empty, dateDetachement: "2026-07-12", datePaiement: "2026-07-20" };
    const result = resolveDividendFields(null, sika, richbourse);
    expect(result.dateDetachement).toBe("2026-07-12");
    expect(result.datePaiement).toBe("2026-07-20");
  });

  it("falls back to Sika dates when RichBourse has none", () => {
    const sika = { ...empty, dateDetachement: "2026-07-10", datePaiement: "2026-07-15" };
    const result = resolveDividendFields(null, sika, null);
    expect(result.dateDetachement).toBe("2026-07-10");
    expect(result.datePaiement).toBe("2026-07-15");
  });

  it("keeps the current dates when neither scraped source has them", () => {
    const current = { ...empty, dateDetachement: "2026-07-01", datePaiement: "2026-07-05" };
    const result = resolveDividendFields(current, null, null);
    expect(result.dateDetachement).toBe("2026-07-01");
    expect(result.datePaiement).toBe("2026-07-05");
  });
});
