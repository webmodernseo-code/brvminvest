// web/lib/validation.test.ts
import { describe, it, expect } from "vitest";
import { validateSignupForm } from "./validation";

describe("validateSignupForm", () => {
  it("rejects a missing nom", () => {
    expect(
      validateSignupForm({ nom: "", prenom: "Awa", email: "a@b.com", password: "secret123" })
    ).toBe("Le nom est requis.");
  });

  it("rejects an invalid email", () => {
    expect(
      validateSignupForm({ nom: "Diop", prenom: "Awa", email: "not-an-email", password: "secret123" })
    ).toBe("L'adresse email n'est pas valide.");
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      validateSignupForm({ nom: "Diop", prenom: "Awa", email: "a@b.com", password: "short" })
    ).toBe("Le mot de passe doit contenir au moins 8 caractères.");
  });

  it("accepts a valid form", () => {
    expect(
      validateSignupForm({ nom: "Diop", prenom: "Awa", email: "a@b.com", password: "secret123" })
    ).toBeNull();
  });
});
