// web/app/api/veille/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const { email } = (await request.json()) as { email: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const supabase = serviceRoleClient();
  const { data: existing } = await supabase
    .from("veille_subscribers")
    .select("email, unsubscribed_at")
    .eq("email", email);

  if (existing && existing.length > 0) {
    const row = existing[0] as { email: string; unsubscribed_at: string | null };

    // If unsubscribed_at is not null, this is a resubscribe request
    if (row.unsubscribed_at !== null) {
      await supabase
        .from("veille_subscribers")
        .update({ unsubscribed_at: null })
        .eq("email", email);
      return NextResponse.json({ alreadySubscribed: false }, { status: 200 });
    }

    // Otherwise, it's a genuine duplicate
    return NextResponse.json({ alreadySubscribed: true }, { status: 200 });
  }

  const { error } = await supabase.from("veille_subscribers").insert({ email });
  if (error) {
    return NextResponse.json({ error: "Inscription impossible." }, { status: 500 });
  }

  return NextResponse.json({ alreadySubscribed: false }, { status: 200 });
}
