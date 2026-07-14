// web/app/api/veille/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";

export async function POST(request: NextRequest) {
  const { token } = (await request.json()) as { token: string };
  const email = verifyUnsubscribeToken(token);

  if (!email) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await supabase
    .from("veille_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email);

  return NextResponse.json({ success: true }, { status: 200 });
}
