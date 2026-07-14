// web/emails/VeilleNotification.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Link } from "@react-email/components";

interface VeilleNotificationEmailProps {
  title: string;
  excerpt: string;
  url: string;
  unsubscribeUrl: string;
}

export function VeilleNotificationEmail({
  title,
  excerpt,
  url,
  unsubscribeUrl,
}: VeilleNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "sans-serif", color: "#111110" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h2">{title}</Heading>
          <Text>{excerpt}</Text>
          <Button
            href={url}
            style={{ backgroundColor: "#111110", color: "#ffffff", padding: "12px 20px", borderRadius: "8px" }}
          >
            Lire sur l'app
          </Button>
          <Text style={{ marginTop: "32px", fontSize: "12px", color: "#63635c" }}>
            <Link href={unsubscribeUrl}>Se désabonner</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
