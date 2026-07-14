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

  const { data: existing, error: selectError } = await supabase
    .from("veille_favorites")
    .select("id")
    .eq("profile_id", user.id)
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (selectError) {
    return NextResponse.json({ error: "Erreur lors de la vérification." }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    const { error: deleteError } = await supabase
      .from("veille_favorites")
      .delete()
      .eq("id", existing[0].id);

    if (deleteError) {
      return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
    }

    return NextResponse.json({ favorited: false }, { status: 200 });
  }

  const { error: insertError } = await supabase.from("veille_favorites").insert({
    profile_id: user.id,
    content_type: contentType,
    content_id: contentId,
  });

  if (insertError) {
    return NextResponse.json({ error: "Ajout impossible." }, { status: 500 });
  }

  return NextResponse.json({ favorited: true }, { status: 200 });
}
