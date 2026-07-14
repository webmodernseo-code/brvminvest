// web/app/api/cron/veille-videos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchLatestVideosForChannel } from "@/lib/youtube";
import { filterUnseenVideos, pickMostRecentVideo } from "@/lib/veille/videoSelection";
import { sendVeilleNotification } from "@/lib/resend";
import type { VideoCandidate } from "@/lib/veille/types";

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceRoleClient();

  const { data: channels } = await supabase
    .from("veille_youtube_channels")
    .select("channel_id, channel_name")
    .eq("active", true);

  const allCandidates: VideoCandidate[] = [];
  for (const channel of channels ?? []) {
    try {
      const videos = await fetchLatestVideosForChannel(channel.channel_id, channel.channel_name);
      allCandidates.push(...videos);
    } catch (err) {
      console.error(`[veille-videos] channel failed: ${channel.channel_name}`, err);
    }
  }

  const { data: existing } = await supabase.from("veille_videos").select("youtube_video_id");
  const knownIds = new Set((existing ?? []).map((row: any) => row.youtube_video_id as string));

  const unseen = filterUnseenVideos(allCandidates, knownIds);
  const picked = pickMostRecentVideo(unseen);

  if (!picked) {
    return NextResponse.json({ inserted: false, reason: "no new candidates" }, { status: 200 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("veille_videos")
    .insert({
      title: picked.title,
      youtube_url: picked.url,
      youtube_video_id: picked.videoId,
      channel_name: picked.channelName,
      published_at: picked.publishedAt,
    })
    .select();

  if (insertError || !inserted?.[0]) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  try {
    await sendVeilleNotification({
      type: "video",
      title: picked.title,
      excerpt: `Nouvelle vidéo de ${picked.channelName}`,
      url: picked.url,
    });
    await supabase
      .from("veille_videos")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", inserted[0].id);
  } catch (err) {
    console.error("[veille-videos] email send failed, will retry next cron", err);
  }

  return NextResponse.json({ inserted: true, videoId: inserted[0].id }, { status: 200 });
}
