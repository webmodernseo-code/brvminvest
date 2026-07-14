// web/app/api/cron/veille-videos/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/youtube", () => ({
  fetchLatestVideosForChannel: vi.fn(),
}));
vi.mock("@/lib/mailer", () => ({
  sendVeilleNotification: vi.fn().mockResolvedValue(undefined),
}));

import { fetchLatestVideosForChannel } from "@/lib/youtube";
import { sendVeilleNotification } from "@/lib/mailer";
import { GET } from "./route";

function makeRequest(secret: string) {
  return new NextRequest("http://localhost:3000/api/cron/veille-videos", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/cron/veille-videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct secret", async () => {
    const response = await GET(makeRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("inserts the most recent unseen video and sends the notification", async () => {
    vi.mocked(fetchLatestVideosForChannel).mockResolvedValue([
      {
        videoId: "vid-1",
        url: "https://youtube.com/watch?v=vid-1",
        title: "Analyse BRVM",
        channelName: "Sikarium",
        publishedAt: "2026-07-13T08:00:00Z",
      },
    ]);

    const channelsEq = vi.fn().mockResolvedValue({ data: [{ channel_id: "c1", channel_name: "Sikarium" }], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "veille_youtube_channels") {
        return { select: vi.fn().mockReturnValue({ eq: channelsEq }) };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: "video-1" }], error: null }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(sendVeilleNotification).toHaveBeenCalledTimes(1);
    // Inactive channels are excluded server-side by Postgres via .eq("active", true) —
    // there is no JS-side filtering left to unit-test, so we assert the query itself
    // is scoped correctly rather than re-testing Postgres's WHERE clause.
    expect(channelsEq).toHaveBeenCalledWith("active", true);
  });
});
