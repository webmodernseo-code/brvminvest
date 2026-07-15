import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let upsertCalls: { payload: unknown; options: unknown }[] = [];

function chainable(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.maybeSingle = () => Promise.resolve(result);
  builder.insert = () => builder;
  builder.upsert = (payload: unknown, options?: unknown) => {
    upsertCalls.push({ payload, options });
    return Promise.resolve(result);
  };
  builder.then = (resolve: (value: unknown) => void) => resolve(result);
  return builder;
}

const mockFrom = vi.fn((_table: string) => chainable({ data: [] }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/firecrawl", () => ({
  scrapeSikaDividends: vi.fn(),
  scrapeRichBourseDividends: vi.fn(),
}));
vi.mock("@/lib/mailer", () => ({
  sendDivialerteAlert: vi.fn().mockResolvedValue(undefined),
}));

import { scrapeSikaDividends, scrapeRichBourseDividends } from "@/lib/firecrawl";
import { GET } from "./route";

function makeRequest(secret: string) {
  return new NextRequest("http://localhost:3000/api/cron/divialerte", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/cron/divialerte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => chainable({ data: [] }));
    upsertCalls = [];
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct secret", async () => {
    const response = await GET(makeRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("completes successfully when both sources scrape cleanly with no watchlist entries", async () => {
    vi.mocked(scrapeSikaDividends).mockResolvedValue([]);
    vi.mocked(scrapeRichBourseDividends).mockResolvedValue([]);

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
  });

  it("still returns 200 when one source throws", async () => {
    vi.mocked(scrapeSikaDividends).mockRejectedValue(new Error("Sika down"));
    vi.mocked(scrapeRichBourseDividends).mockResolvedValue([]);

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
  });

  it("keeps Sika's montant when both sources report the same company/year", async () => {
    const company = { id: "company-1", name: "Societe Test", ticker: "STEST", country: "CI" };

    mockFrom.mockImplementation((table: string) => {
      if (table === "divialerte_companies") {
        return chainable({ data: [company] });
      }
      if (table === "divialerte_dividends") {
        return chainable({ data: null });
      }
      return chainable({ data: [] });
    });

    vi.mocked(scrapeSikaDividends).mockResolvedValue([
      {
        companyName: "Societe Test",
        ticker: "STEST",
        country: "CI",
        montant: 100,
        rendement: 5,
        dateDetachement: "2026-07-10",
        datePaiement: "2026-07-15",
        sourceName: "Sika Finance",
      },
    ]);
    vi.mocked(scrapeRichBourseDividends).mockResolvedValue([
      {
        companyName: "Societe Test",
        ticker: "STEST",
        country: "CI",
        montant: 200,
        rendement: 6,
        dateDetachement: "2026-07-12",
        datePaiement: "2026-07-20",
        sourceName: "RichBourse",
      },
    ]);

    const response = await GET(makeRequest("test-secret"));
    expect(response.status).toBe(200);

    expect(upsertCalls.length).toBeGreaterThan(0);
    const lastUpsert = upsertCalls[upsertCalls.length - 1].payload as { montant: number | null };
    expect(lastUpsert.montant).toBe(100);
  });
});
