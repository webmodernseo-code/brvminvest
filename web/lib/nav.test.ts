import { describe, it, expect } from "vitest";
import { isNavHidden, getActiveNavId } from "./nav";

describe("isNavHidden", () => {
  it("hides the bar on standalone auth/unsubscribe routes", () => {
    expect(isNavHidden("/login")).toBe(true);
    expect(isNavHidden("/signup")).toBe(true);
    expect(isNavHidden("/veille/unsubscribe")).toBe(true);
    expect(isNavHidden("/forgot-password")).toBe(true);
    expect(isNavHidden("/reset-password")).toBe(true);
  });

  it("shows the bar everywhere else", () => {
    expect(isNavHidden("/")).toBe(false);
    expect(isNavHidden("/veille")).toBe(false);
    expect(isNavHidden("/divialerte")).toBe(false);
    expect(isNavHidden("/gestia")).toBe(false);
  });
});

describe("getActiveNavId", () => {
  it("matches accueil only on the exact root path", () => {
    expect(getActiveNavId("/")).toBe("accueil");
  });

  it("matches veille by prefix", () => {
    expect(getActiveNavId("/veille")).toBe("veille");
  });

  it("returns null on the excluded unsubscribe route", () => {
    expect(getActiveNavId("/veille/unsubscribe")).toBeNull();
  });

  it("matches divialerte and gestia", () => {
    expect(getActiveNavId("/divialerte")).toBe("divialerte");
    expect(getActiveNavId("/gestia")).toBe("gestia");
  });

  it("returns null for an unrelated path", () => {
    expect(getActiveNavId("/foo")).toBeNull();
  });
});
