import type { CompanyRecord } from "./types";

export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function matchCompany(
  row: { ticker: string | null; companyName: string },
  companies: CompanyRecord[]
): CompanyRecord | null {
  if (row.ticker) {
    const byTicker = companies.find(
      (c) => c.ticker && c.ticker.toUpperCase() === row.ticker!.toUpperCase()
    );
    if (byTicker) return byTicker;
  }
  const normalized = normalizeCompanyName(row.companyName);
  return companies.find((c) => normalizeCompanyName(c.name) === normalized) ?? null;
}
