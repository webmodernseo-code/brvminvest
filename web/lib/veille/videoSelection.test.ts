import { describe, it, expect } from "vitest";
import { filterUnseenVideos, pickMostRecentVideo } from "./videoSelection";
import type { VideoCandidate } from "./types";

const makeCandidate = (overrides: Partial<VideoCandidate>): VideoCandidate => ({
  videoId: "abc",
  url: "https://youtube.com/watch?v=abc",
  title: "Titre",
  channelName: "Sikarium",
  publishedAt: "2026-07-10T00:00:00Z",
  ...overrides,
});

describe("filterUnseenVideos", () => {
  it("removes videos whose id is already known", () => {
    const candidates = [makeCandidate({ videoId: "known" }), makeCandidate({ videoId: "new" })];
    const known = new Set(["known"]);
    expect(filterUnseenVideos(candidates, known)).toEqual([makeCandidate({ videoId: "new" })]);
  });
});

describe("pickMostRecentVideo", () => {
  it("picks the video with the latest publishedAt across channels", () => {
    const older = makeCandidate({ videoId: "older", publishedAt: "2026-07-01T00:00:00Z" });
    const newer = makeCandidate({ videoId: "newer", publishedAt: "2026-07-12T00:00:00Z" });
    expect(pickMostRecentVideo([older, newer])).toEqual(newer);
  });

  it("returns null when there are no candidates", () => {
    expect(pickMostRecentVideo([])).toBeNull();
  });
});
