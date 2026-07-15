import { describe, it, expect } from "vitest";
import { normalizeCompanyName, matchCompany } from "./companyMatching";
import type { CompanyRecord } from "./types";

describe("normalizeCompanyName", () => {
  it("uppercases, strips accents, and collapses whitespace", () => {
    expect(normalizeCompanyName("Société  Générale")).toBe("SOCIETE GENERALE");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeCompanyName("  SERVAIR  ")).toBe("SERVAIR");
  });
});

describe("matchCompany", () => {
  const companies: CompanyRecord[] = [
    { id: "1", name: "SERVAIR", ticker: "SVR", country: "ci" },
    { id: "2", name: "SOCIETE GENERALE", ticker: null, country: "ci" },
  ];

  it("matches by ticker case-insensitively", () => {
    expect(matchCompany({ ticker: "svr", companyName: "anything" }, companies)).toEqual(companies[0]);
  });

  it("falls back to normalized name when there is no ticker match", () => {
    expect(matchCompany({ ticker: null, companyName: "Société Générale" }, companies)).toEqual(companies[1]);
  });

  it("returns null when nothing matches", () => {
    expect(matchCompany({ ticker: "ZZZ", companyName: "Unknown Corp" }, companies)).toBeNull();
  });
});
