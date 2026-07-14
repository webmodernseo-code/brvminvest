import type { VideoCandidate } from "./types";

export function filterUnseenVideos(
  candidates: VideoCandidate[],
  knownVideoIds: Set<string>
): VideoCandidate[] {
  return candidates.filter((candidate) => !knownVideoIds.has(candidate.videoId));
}

export function pickMostRecentVideo(candidates: VideoCandidate[]): VideoCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )[0];
}
