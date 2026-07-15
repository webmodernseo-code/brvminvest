import type { ResolvedDividendFields } from "./types";

export function resolveDividendFields(
  current: ResolvedDividendFields | null,
  sika: ResolvedDividendFields | null,
  richbourse: ResolvedDividendFields | null
): ResolvedDividendFields {
  return {
    montant: sika?.montant ?? richbourse?.montant ?? current?.montant ?? null,
    rendement: sika?.rendement ?? richbourse?.rendement ?? current?.rendement ?? null,
    dateDetachement:
      richbourse?.dateDetachement ?? sika?.dateDetachement ?? current?.dateDetachement ?? null,
    datePaiement: richbourse?.datePaiement ?? sika?.datePaiement ?? current?.datePaiement ?? null,
  };
}
