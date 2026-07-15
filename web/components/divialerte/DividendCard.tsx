import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WatchBell } from "@/components/divialerte/WatchBell";
import { daysUntil } from "@/lib/divialerte/dateUtils";
import { calculateNetDividend } from "@/lib/divialerte/irvm";

export interface DividendCardData {
  companyId: string;
  companyName: string;
  country: string | null;
  montant: number | null;
  rendement: number | null;
  dateDetachement: string | null;
  datePaiement: string | null;
}

export function DividendCard({
  dividend,
  loggedIn,
  isWatching,
}: {
  dividend: DividendCardData;
  loggedIn: boolean;
  isWatching: boolean;
}) {
  const daysLeft = dividend.dateDetachement ? daysUntil(dividend.dateDetachement) : null;
  const montantNet = calculateNetDividend(dividend.montant, dividend.country);

  return (
    <Card padding={16}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text-primary">{dividend.companyName}</p>
          <p className="mt-1 text-sm text-text-tertiary">
            {dividend.montant !== null ? `${dividend.montant} FCFA brut` : "Montant à préciser"}
            {montantNet !== null && ` · ${montantNet} FCFA net (IRVM)`}
            {dividend.rendement !== null ? ` · ${dividend.rendement}%` : ""}
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            {dividend.dateDetachement
              ? `Détachement : ${new Date(dividend.dateDetachement).toLocaleDateString("fr-FR")}`
              : "Date à préciser"}
            {dividend.datePaiement &&
              ` · Paiement : ${new Date(dividend.datePaiement).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {daysLeft !== null && daysLeft >= 0 && <Badge tone="neutral">{`J-${daysLeft}`}</Badge>}
          <WatchBell companyId={dividend.companyId} initiallyWatching={isWatching} loggedIn={loggedIn} />
        </div>
      </div>
    </Card>
  );
}
