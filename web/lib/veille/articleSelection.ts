import type { ArticleCandidate } from "./types";

export function filterUnseenCandidates(
  candidates: ArticleCandidate[],
  knownUrls: Set<string>
): ArticleCandidate[] {
  return candidates.filter((candidate) => !knownUrls.has(candidate.url));
}

export function pickMostRecentCandidate(candidates: ArticleCandidate[]): ArticleCandidate | null {
  return candidates[0] ?? null;
}
