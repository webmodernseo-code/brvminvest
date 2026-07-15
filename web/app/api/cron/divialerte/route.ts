import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeSikaDividends, scrapeRichBourseDividends } from "@/lib/firecrawl";
import { matchCompany } from "@/lib/divialerte/companyMatching";
import { resolveDividendFields } from "@/lib/divialerte/mergeDividends";
import { daysUntil, deriveExerciceYear } from "@/lib/divialerte/dateUtils";
import { determineAlertsToSend, type AlertType } from "@/lib/divialerte/alertLogic";
import { calculateNetDividend } from "@/lib/divialerte/irvm";
import { sendDivialerteAlert } from "@/lib/mailer";
import type { CompanyRecord, DividendRow } from "@/lib/divialerte/types";

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceRoleClient();

  const scraped: DividendRow[] = [];
  try {
    scraped.push(...(await scrapeSikaDividends()));
  } catch (err) {
    console.error("[divialerte] Sika Finance scrape failed", err);
  }
  try {
    scraped.push(...(await scrapeRichBourseDividends()));
  } catch (err) {
    console.error("[divialerte] RichBourse scrape failed", err);
  }

  const { data: existingCompanies } = await supabase
    .from("divialerte_companies")
    .select("id, name, ticker, country");
  const companies: CompanyRecord[] = existingCompanies ?? [];

  for (const row of scraped) {
    let company = matchCompany({ ticker: row.ticker, companyName: row.companyName }, companies);

    if (!company) {
      const { data: created } = await supabase
        .from("divialerte_companies")
        .insert({ name: row.companyName, ticker: row.ticker, country: row.country })
        .select();
      if (!created?.[0]) continue;
      company = created[0] as CompanyRecord;
      companies.push(company);
    } else if (!company.country && row.country) {
      await supabase.from("divialerte_companies").update({ country: row.country }).eq("id", company.id);
      company.country = row.country;
    }

    const exerciceYear = deriveExerciceYear(row.dateDetachement);

    const { data: existingDividend } = await supabase
      .from("divialerte_dividends")
      .select("id, montant, rendement, date_detachement, date_paiement")
      .eq("company_id", company.id)
      .eq("exercice_year", exerciceYear)
      .maybeSingle();

    const currentFields = existingDividend
      ? {
          montant: existingDividend.montant,
          rendement: existingDividend.rendement,
          dateDetachement: existingDividend.date_detachement,
          datePaiement: existingDividend.date_paiement,
        }
      : null;
    const sikaFields = row.sourceName === "Sika Finance" ? row : null;
    const richbourseFields = row.sourceName === "RichBourse" ? row : null;
    const resolved = resolveDividendFields(currentFields, sikaFields, richbourseFields);

    await supabase.from("divialerte_dividends").upsert(
      {
        id: existingDividend?.id,
        company_id: company.id,
        exercice_year: exerciceYear,
        montant: resolved.montant,
        rendement: resolved.rendement,
        date_detachement: resolved.dateDetachement,
        date_paiement: resolved.datePaiement,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,exercice_year" }
    );
  }

  const { data: watchlist } = await supabase
    .from("divialerte_watchlist")
    .select("profile_id, company_id, profiles(email), divialerte_companies(name, country)");

  const { data: sentAlerts } = await supabase
    .from("divialerte_alerts_sent")
    .select("profile_id, dividend_id, alert_type");
  const sentByKey = new Map<string, Set<AlertType>>();
  for (const sent of (sentAlerts ?? []) as { profile_id: string; dividend_id: string; alert_type: AlertType }[]) {
    const key = `${sent.profile_id}:${sent.dividend_id}`;
    if (!sentByKey.has(key)) sentByKey.set(key, new Set());
    sentByKey.get(key)!.add(sent.alert_type);
  }

  const currentYear = new Date().getUTCFullYear();
  const { data: currentDividends } = await supabase
    .from("divialerte_dividends")
    .select("id, company_id, date_detachement, date_paiement, montant, rendement")
    .eq("exercice_year", currentYear);
  const dividendByCompany = new Map(
    ((currentDividends ?? []) as {
      id: string;
      company_id: string;
      date_detachement: string | null;
      date_paiement: string | null;
      montant: number | null;
      rendement: number | null;
    }[]).map((d) => [d.company_id, d])
  );

  for (const entry of (watchlist ?? []) as unknown as {
    profile_id: string;
    company_id: string;
    profiles: { email: string } | null;
    divialerte_companies: { name: string; country: string | null } | null;
  }[]) {
    const dividend = dividendByCompany.get(entry.company_id);
    if (!dividend || !dividend.date_detachement || !entry.profiles) continue;

    const daysLeft = daysUntil(dividend.date_detachement);
    const alreadySent = sentByKey.get(`${entry.profile_id}:${dividend.id}`) ?? new Set<AlertType>();
    const toSend = determineAlertsToSend(daysLeft, alreadySent);

    for (const alertType of toSend) {
      try {
        await sendDivialerteAlert({
          email: entry.profiles.email,
          companyName: entry.divialerte_companies?.name ?? "Société",
          montant: dividend.montant,
          montantNet: calculateNetDividend(dividend.montant, entry.divialerte_companies?.country ?? null),
          rendement: dividend.rendement,
          dateDetachement: dividend.date_detachement,
          datePaiement: dividend.date_paiement,
          daysLeft,
        });
        await supabase.from("divialerte_alerts_sent").insert({
          profile_id: entry.profile_id,
          dividend_id: dividend.id,
          alert_type: alertType,
        });
      } catch (err) {
        console.error(`[divialerte] alert email failed for ${entry.profile_id}`, err);
      }
    }
  }

  return NextResponse.json({ companiesSeen: scraped.length }, { status: 200 });
}
