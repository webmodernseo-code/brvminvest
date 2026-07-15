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

  const { companyId } = (await request.json()) as { companyId: string };

  const { data: existing, error: selectError } = await supabase
    .from("divialerte_watchlist")
    .select("id")
    .eq("profile_id", user.id)
    .eq("company_id", companyId);

  if (selectError) {
    return NextResponse.json({ error: "Erreur lors de la vérification." }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    const { error: deleteError } = await supabase
      .from("divialerte_watchlist")
      .delete()
      .eq("id", existing[0].id);

    if (deleteError) {
      return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
    }

    return NextResponse.json({ watching: false }, { status: 200 });
  }

  const { error: insertError } = await supabase.from("divialerte_watchlist").insert({
    profile_id: user.id,
    company_id: companyId,
  });

  if (insertError) {
    return NextResponse.json({ error: "Ajout impossible." }, { status: 500 });
  }

  return NextResponse.json({ watching: true }, { status: 200 });
}
