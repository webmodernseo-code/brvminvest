// web/lib/resend.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSend = vi.fn().mockResolvedValue({ data: [{ id: "email-1" }], error: null });

vi.mock("resend", () => ({
  // A regular `function` (not an arrow function) is required here: the real
  // implementation calls `new Resend(...)`, and arrow functions have no
  // [[Construct]] internal method, so `new` on an arrow-function
  // implementation always throws "is not a constructor".
  Resend: vi.fn().mockImplementation(function () {
    return { batch: { send: mockSend } };
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { sendVeilleNotification } from "./resend";

describe("sendVeilleNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
    // Mirrors the real @supabase/supabase-js chain: .from().select().is()
    // resolves at the end of the chain, so `select` must return an object
    // exposing `.is` rather than resolving immediately.
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({
          data: [{ email: "a@b.com" }, { email: "c@d.com" }],
          error: null,
        }),
      }),
    });
  });

  it("sends one personalized email per active subscriber via batch", async () => {
    await sendVeilleNotification({
      type: "article",
      title: "BRVM en hausse",
      excerpt: "Le marché progresse.",
      url: "https://example.com/article",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const batch = mockSend.mock.calls[0][0];
    expect(batch).toHaveLength(2);
    expect(batch[0].to).toEqual(["a@b.com"]);
    expect(batch[1].to).toEqual(["c@d.com"]);
    expect(batch[0].subject).toContain("BRVM en hausse");
    // Each recipient gets a distinct unsubscribe link tied to their own email.
    expect(batch[0].html).not.toEqual(batch[1].html);
  });

  it("does nothing when there are no active subscribers", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    });

    await sendVeilleNotification({
      type: "video",
      title: "Analyse BRVM",
      excerpt: "Nouvelle vidéo",
      url: "https://youtube.com/watch?v=1",
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
