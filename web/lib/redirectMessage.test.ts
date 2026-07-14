import { describe, it, expect } from "vitest";
import { redirectMessage } from "./redirectMessage";

describe("redirectMessage", () => {
  it("returns null when there is no redirect target", () => {
    expect(redirectMessage(null)).toBeNull();
  });

  it("explains DiviAlerte redirects", () => {
    expect(redirectMessage("/divialerte")).toBe("Connecte-toi pour accéder à DiviAlerte.");
  });

  it("explains Gestia redirects", () => {
    expect(redirectMessage("/gestia")).toBe("Connecte-toi pour accéder à Gestia.BRVM.");
  });

  it("returns null for an unrelated redirect target", () => {
    expect(redirectMessage("/veille")).toBeNull();
  });
});
