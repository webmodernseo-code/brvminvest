// Taux IRVM (Impôt sur le Revenu des Valeurs Mobilières) sur dividendes,
// vérifiés le 2026-07-15 (voir spec section 3bis). Niger et Guinée-Bissau
// sont volontairement absents : leur taux n'a pas pu être vérifié, mieux
// vaut ne rien afficher que d'inventer un chiffre.
export const IRVM_RATES_BY_COUNTRY: Record<string, number> = {
  ci: 0.1,
  sn: 0.1,
  bf: 0.125,
  ml: 0.07,
  bj: 0.05,
  tg: 0.03,
};

export function calculateNetDividend(montant: number | null, countryCode: string | null): number | null {
  if (montant === null || countryCode === null) return null;
  const rate = IRVM_RATES_BY_COUNTRY[countryCode.toLowerCase()];
  if (rate === undefined) return null;
  return Math.round(montant * (1 - rate) * 100) / 100;
}
