// web/lib/mailer.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSendMail = vi.fn().mockResolvedValue({ messageId: "email-1" });
const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail });

vi.mock("nodemailer", () => ({
  default: { createTransport: (...args: unknown[]) => mockCreateTransport(...args) },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { sendVeilleNotification } from "./mailer";

describe("sendVeilleNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
    process.env.SMTP_HOST = "foulque.o2switch.net";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "veille@brvminvest.webmodernseo.co";
    process.env.SMTP_PASSWORD = "test-password";
    process.env.SMTP_FROM = "veille@brvminvest.webmodernseo.co";
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

  it("sends one personalized email per active subscriber over SMTP", async () => {
    await sendVeilleNotification({
      type: "article",
      title: "BRVM en hausse",
      excerpt: "Le marché progresse.",
      url: "https://example.com/article",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = mockSendMail.mock.calls.map((call) => call[0]);
    expect(firstCall.to).toEqual("a@b.com");
    expect(secondCall.to).toEqual("c@d.com");
    expect(firstCall.subject).toContain("BRVM en hausse");
    // Each recipient gets a distinct unsubscribe link tied to their own email.
    expect(firstCall.html).not.toEqual(secondCall.html);
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

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });
});
