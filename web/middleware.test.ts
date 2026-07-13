import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("./lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

import { updateSession } from "./lib/supabase/middleware";
import { middleware } from "./middleware";

describe("middleware route guard", () => {
  it("redirects to /login when hitting /gestia without a session", async () => {
    (updateSession as any).mockResolvedValue({
      response: new Response(null) as any,
      user: null,
    });

    const request = new NextRequest("http://localhost:3000/gestia");
    const result = await middleware(request);

    expect(result.status).toBe(307);
    expect(result.headers.get("location")).toContain("/login");
  });

  it("passes through /veille without a session", async () => {
    (updateSession as any).mockResolvedValue({
      response: new Response(null, { status: 200 }) as any,
      user: null,
    });

    const request = new NextRequest("http://localhost:3000/veille");
    const result = await middleware(request);

    expect(result.status).toBe(200);
  });
});
