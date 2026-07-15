export interface DividendRow {
  companyName: string;
  ticker: string | null;
  country: string | null;
  montant: number | null;
  rendement: number | null;
  dateDetachement: string | null;
  datePaiement: string | null;
  sourceName: "Sika Finance" | "RichBourse";
}

export interface CompanyRecord {
  id: string;
  name: string;
  ticker: string | null;
  country: string | null;
}

export interface ResolvedDividendFields {
  montant: number | null;
  rendement: number | null;
  dateDetachement: string | null;
  datePaiement: string | null;
}
