import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

function chainable(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.maybeSingle = () => Promise.resolve(result);
  builder.insert = () => builder;
  builder.upsert = () => Promise.resolve(result);
  builder.then = (resolve: (value: unknown) => void) => resolve(result);
  return builder;
}

const mockFrom = vi.fn(() => chainable({ data: [] }));

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
});
