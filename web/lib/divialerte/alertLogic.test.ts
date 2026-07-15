import { describe, it, expect } from "vitest";
import { determineAlertsToSend } from "./alertLogic";

describe("determineAlertsToSend", () => {
  it("returns nothing when the date is unknown", () => {
    expect(determineAlertsToSend(null, new Set())).toEqual([]);
  });

  it("returns nothing for a date already past", () => {
    expect(determineAlertsToSend(-1, new Set())).toEqual([]);
  });

  it("returns nothing when more than 3 days remain", () => {
    expect(determineAlertsToSend(5, new Set())).toEqual([]);
  });

  it("triggers j3 at exactly 3 days left", () => {
    expect(determineAlertsToSend(3, new Set())).toEqual(["j3"]);
  });

  it("triggers both j3 and j1 when they haven't been sent and only 1 day remains", () => {
    expect(determineAlertsToSend(1, new Set())).toEqual(["j3", "j1"]);
  });

  it("skips j3 when it was already sent", () => {
    expect(determineAlertsToSend(1, new Set(["j3"]))).toEqual(["j1"]);
  });

  it("returns nothing when both were already sent", () => {
    expect(determineAlertsToSend(0, new Set(["j3", "j1"]))).toEqual([]);
  });
});
