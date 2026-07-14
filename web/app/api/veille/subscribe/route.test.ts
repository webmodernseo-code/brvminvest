// web/app/api/veille/subscribe/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/veille/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/veille/subscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a new subscriber", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(),
    });

    const response = await POST(makeRequest({ email: "new@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.alreadySubscribed).toBe(false);
  });

  it("reports alreadySubscribed instead of erroring on duplicates", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ email: "existing@example.com", unsubscribed_at: null }], error: null }),
      }),
      insert: vi.fn(),
      update: vi.fn(),
    });

    const response = await POST(makeRequest({ email: "existing@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.alreadySubscribed).toBe(true);
  });

  it("reactivates an unsubscribed subscriber", async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ email: "resubscribe@example.com", unsubscribed_at: "2026-07-01T10:00:00Z" }],
          error: null,
        }),
      }),
      update: updateMock,
      insert: vi.fn(),
    });

    const response = await POST(makeRequest({ email: "resubscribe@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.alreadySubscribed).toBe(false);
    expect(updateMock).toHaveBeenCalledWith({ unsubscribed_at: null });
  });
});
