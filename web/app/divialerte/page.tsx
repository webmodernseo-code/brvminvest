import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DiviAlerteClient } from "./DiviAlerteClient";

interface DividendRow {
  id: string;
  company_id: string;
  montant: number | null;
  rendement: number | null;
  date_detachement: string | null;
  date_paiement: string | null;
  // PostgREST embeds a many-to-one relation (dividend -> company) as a single
  // object at runtime; the untyped Supabase client can't infer this without
  // generated DB types, so we assert the shape explicitly below.
  divialerte_companies: { name: string; country: string | null } | null;
}

export default async function DiviAlertePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentYear = new Date().getUTCFullYear();

  const { data: dividends } = await supabase
    .from("divialerte_dividends")
    .select(
      "id, company_id, montant, rendement, date_detachement, date_paiement, divialerte_companies(name, country)"
    )
    .eq("exercice_year", currentYear)
    .order("date_detachement", { ascending: true, nullsFirst: false });

  let watchedCompanyIds = new Set<string>();
  if (user) {
    const { data: watchlist } = await supabase
      .from("divialerte_watchlist")
      .select("company_id")
      .eq("profile_id", user.id);
    watchedCompanyIds = new Set((watchlist ?? []).map((w: { company_id: string }) => w.company_id));
  }

  return (
    <DiviAlerteClient
      loggedIn={!!user}
      watchedCompanyIds={Array.from(watchedCompanyIds)}
      dividends={((dividends ?? []) as unknown as DividendRow[]).map(
        (d) => ({
          companyId: d.company_id,
          companyName: d.divialerte_companies?.name ?? "Société inconnue",
          country: d.divialerte_companies?.country ?? null,
          montant: d.montant,
          rendement: d.rendement,
          dateDetachement: d.date_detachement,
          datePaiement: d.date_paiement,
        })
      )}
    />
  );
}
