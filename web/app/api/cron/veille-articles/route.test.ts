// web/app/api/cron/veille-articles/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/firecrawl", () => ({
  scrapeListingLinks: vi.fn(),
  scrapeArticleContent: vi.fn(),
}));
vi.mock("@/lib/mailer", () => ({
  sendVeilleNotification: vi.fn().mockResolvedValue(undefined),
}));

import { scrapeListingLinks, scrapeArticleContent } from "@/lib/firecrawl";
import { sendVeilleNotification } from "@/lib/mailer";
import { GET } from "./route";

function makeRequest(secret: string) {
  return new NextRequest("http://localhost:3000/api/cron/veille-articles", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/cron/veille-articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct secret", async () => {
    const response = await GET(makeRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("inserts the first unseen article and sends the notification", async () => {
    vi.mocked(scrapeListingLinks).mockResolvedValue([{ url: "https://sikafinance.com/article-1" }]);
    vi.mocked(scrapeArticleContent).mockResolvedValue({
      title: "BRVM en hausse",
      excerpt: "Le marché progresse cette semaine.",
      publishedAt: "2026-07-13T08:00:00Z",
    });

    const selectChain = { data: [], error: null };
    const insertChain = { data: [{ id: "article-1" }], error: null };
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue(selectChain),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(insertChain),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(sendVeilleNotification).toHaveBeenCalledTimes(1);
  });
});
