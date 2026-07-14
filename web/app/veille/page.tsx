import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VeilleFeedClient } from "./VeilleFeedClient";

export default async function VeillePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: articles } = await supabase
    .from("veille_articles")
    .select("id, title, excerpt, source_name, published_at")
    .order("published_at", { ascending: false });

  const { data: videos } = await supabase
    .from("veille_videos")
    .select("id, title, youtube_video_id, channel_name, published_at")
    .order("published_at", { ascending: false });

  let favoriteIds = new Set<string>();
  if (user) {
    const { data: favorites } = await supabase
      .from("veille_favorites")
      .select("content_id")
      .eq("profile_id", user.id);
    favoriteIds = new Set((favorites ?? []).map((f: any) => f.content_id as string));
  }

  return (
    <VeilleFeedClient
      loggedIn={!!user}
      favoriteIds={Array.from(favoriteIds)}
      articles={(articles ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        sourceName: a.source_name,
        publishedAt: a.published_at,
      }))}
      videos={(videos ?? []).map((v: any) => ({
        id: v.id,
        title: v.title,
        youtubeVideoId: v.youtube_video_id,
        channelName: v.channel_name,
        publishedAt: v.published_at,
      }))}
    />
  );
}
