// web/lib/unsubscribeToken.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribeToken";

describe("unsubscribe token", () => {
  beforeAll(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
  });

  it("verifies a token it created", () => {
    const token = createUnsubscribeToken("a@b.com");
    expect(verifyUnsubscribeToken(token)).toBe("a@b.com");
  });

  it("rejects a tampered token", () => {
    const token = createUnsubscribeToken("a@b.com");
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });
});
