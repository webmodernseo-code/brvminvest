import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/divialerte/watchlist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/divialerte/watchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(makeRequest({ companyId: "c1" }));
    expect(response.status).toBe(401);
  });

  it("adds to the watchlist when not already watching", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.watching).toBe(true);
  });

  it("removes from the watchlist when already watching (toggle)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "watch-1" }], error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.watching).toBe(false);
  });

  it("returns 500 when select query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: "RLS violation" } }),
        }),
      }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBeDefined();
  });

  it("returns 500 when insert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
      insert: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBeDefined();
  });

  it("returns 500 when delete fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "watch-1" }], error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }) }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
