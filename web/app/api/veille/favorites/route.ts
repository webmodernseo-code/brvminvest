import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { contentType, contentId } = (await request.json()) as {
    contentType: "article" | "video";
    contentId: string;
  };

  const { data: existing } = await supabase
    .from("veille_favorites")
    .select("id")
    .eq("profile_id", user.id)
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (existing && existing.length > 0) {
    await supabase.from("veille_favorites").delete().eq("id", existing[0].id);
    return NextResponse.json({ favorited: false }, { status: 200 });
  }

  await supabase.from("veille_favorites").insert({
    profile_id: user.id,
    content_type: contentType,
    content_id: contentId,
  });
  return NextResponse.json({ favorited: true }, { status: 200 });
}
