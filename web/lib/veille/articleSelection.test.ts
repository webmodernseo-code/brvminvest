import { describe, it, expect } from "vitest";
import { filterUnseenCandidates, pickMostRecentCandidate } from "./articleSelection";
import type { ArticleCandidate } from "./types";

describe("filterUnseenCandidates", () => {
  it("removes candidates whose url is already known", () => {
    const candidates: ArticleCandidate[] = [
      { url: "https://a.com/1", sourceName: "Sika Finance" },
      { url: "https://a.com/2", sourceName: "Sika Finance" },
    ];
    const known = new Set(["https://a.com/1"]);
    expect(filterUnseenCandidates(candidates, known)).toEqual([
      { url: "https://a.com/2", sourceName: "Sika Finance" },
    ]);
  });

  it("returns an empty array when everything is already known", () => {
    const candidates: ArticleCandidate[] = [{ url: "https://a.com/1", sourceName: "Sika Finance" }];
    const known = new Set(["https://a.com/1"]);
    expect(filterUnseenCandidates(candidates, known)).toEqual([]);
  });
});

describe("pickMostRecentCandidate", () => {
  it("picks the first candidate when candidates exist", () => {
    const candidates: ArticleCandidate[] = [
      { url: "https://a.com/1", sourceName: "Sika Finance" },
      { url: "https://b.com/2", sourceName: "Financial Afrik" },
    ];
    expect(pickMostRecentCandidate(candidates)).toEqual({
      url: "https://a.com/1",
      sourceName: "Sika Finance",
    });
  });

  it("returns null when there are no candidates", () => {
    expect(pickMostRecentCandidate([])).toBeNull();
  });
});
