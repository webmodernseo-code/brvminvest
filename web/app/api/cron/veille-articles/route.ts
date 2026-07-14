// web/app/api/cron/veille-articles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeListingLinks, scrapeArticleContent } from "@/lib/firecrawl";
import { filterUnseenCandidates, pickMostRecentCandidate } from "@/lib/veille/articleSelection";
import { sendVeilleNotification } from "@/lib/resend";
import type { ArticleCandidate } from "@/lib/veille/types";

const SOURCES: { name: string; listingUrl: string }[] = [
  { name: "Sika Finance", listingUrl: "https://www.sikafinance.com/marches/actualites_bourse_brvm" },
  { name: "Financial Afrik", listingUrl: "https://www.financialafrik.com/?s=BRVM" },
  { name: "RichBourse", listingUrl: "https://www.richbourse.com/common/news/index" },
  { name: "BRVM.org", listingUrl: "https://www.brvm.org/fr/actualites" },
];

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceRoleClient();

  const { data: existing } = await supabase.from("veille_articles").select("source_url");
  const knownUrls = new Set((existing ?? []).map((row: { source_url: string }) => row.source_url));

  const allCandidates: ArticleCandidate[] = [];
  for (const source of SOURCES) {
    try {
      const links = await scrapeListingLinks(source.listingUrl);
      for (const link of links) {
        allCandidates.push({ url: link.url, sourceName: source.name });
      }
    } catch (err) {
      console.error(`[veille-articles] source failed: ${source.name}`, err);
    }
  }

  const unseen = filterUnseenCandidates(allCandidates, knownUrls);
  const picked = pickMostRecentCandidate(unseen);

  if (!picked) {
    return NextResponse.json({ inserted: false, reason: "no new candidates" }, { status: 200 });
  }

  const content = await scrapeArticleContent(picked.url);

  const { data: inserted, error: insertError } = await supabase
    .from("veille_articles")
    .insert({
      title: content.title,
      excerpt: content.excerpt,
      source_name: picked.sourceName,
      source_url: picked.url,
      published_at: content.publishedAt ?? new Date().toISOString(),
    })
    .select();

  if (insertError || !inserted?.[0]) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  try {
    await sendVeilleNotification({
      type: "article",
      title: content.title,
      excerpt: content.excerpt,
      url: picked.url,
    });
    await supabase
      .from("veille_articles")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", inserted[0].id);
  } catch (err) {
    console.error("[veille-articles] email send failed, will retry next cron", err);
  }

  return NextResponse.json({ inserted: true, articleId: inserted[0].id }, { status: 200 });
}
