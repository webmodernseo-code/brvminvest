// web/emails/DivialerteAlert.tsx
import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

interface DivialerteAlertEmailProps {
  companyName: string;
  montant: number | null;
  montantNet: number | null;
  rendement: number | null;
  dateDetachement: string;
  datePaiement: string | null;
  daysLeft: number;
  appUrl: string;
}

export function DivialerteAlertEmail({
  companyName,
  montant,
  montantNet,
  rendement,
  dateDetachement,
  datePaiement,
  daysLeft,
  appUrl,
}: DivialerteAlertEmailProps) {
  const formattedDetachement = new Date(dateDetachement).toLocaleDateString("fr-FR");
  const formattedPaiement = datePaiement ? new Date(datePaiement).toLocaleDateString("fr-FR") : "à préciser";

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "sans-serif", color: "#111110" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h2">
            Dividende {companyName} {daysLeft <= 1 ? "demain" : `dans ${daysLeft} jours`}
          </Heading>
          <Text>Montant brut : {montant !== null ? `${montant} FCFA` : "à préciser"}</Text>
          {montantNet !== null && <Text>Montant net (après IRVM) : {montantNet} FCFA</Text>}
          <Text>Rendement : {rendement !== null ? `${rendement}%` : "à préciser"}</Text>
          <Text>Date de détachement : {formattedDetachement}</Text>
          <Text>Date de paiement : {formattedPaiement}</Text>
          <Button
            href={`${appUrl}/divialerte`}
            style={{ backgroundColor: "#111110", color: "#ffffff", padding: "12px 20px", borderRadius: "8px" }}
          >
            Voir sur l'app
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
