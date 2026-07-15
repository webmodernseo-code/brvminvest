import type { VideoCandidate } from "./veille/types";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

interface YoutubeSearchItem {
  id: { videoId: string };
  snippet: { title: string; publishedAt: string };
}

export async function fetchLatestVideosForChannel(
  channelId: string,
  channelName: string
): Promise<VideoCandidate[]> {
  // `order=date` combined with `type=video` triggers a spurious 403
  // ("accountDelegationForbidden") from the YouTube Data API — each works
  // fine alone. We drop `order` and rely on the caller (pickMostRecentVideo)
  // to sort by publishedAt, with a higher maxResults to compensate for the
  // default relevance ordering.
  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "10");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`YouTube API error for channel ${channelName}: ${response.status}`);
  }

  const json = await response.json();
  const items = (json.items ?? []) as YoutubeSearchItem[];

  return items.map((item) => ({
    videoId: item.id.videoId,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    title: item.snippet.title,
    channelName,
    publishedAt: item.snippet.publishedAt,
  }));
}
