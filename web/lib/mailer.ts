// web/lib/mailer.ts
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { VeilleNotificationEmail } from "@/emails/VeilleNotification";
import { DivialerteAlertEmail } from "@/emails/DivialerteAlert";
import { createUnsubscribeToken } from "@/lib/unsubscribeToken";

interface NotificationInput {
  type: "article" | "video";
  title: string;
  excerpt: string;
  url: string;
}

interface DivialerteAlertInput {
  email: string;
  companyName: string;
  montant: number | null;
  montantNet: number | null;
  rendement: number | null;
  dateDetachement: string;
  datePaiement: string | null;
  daysLeft: number;
}

function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT!),
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
  });
}

export async function sendVeilleNotification(input: NotificationInput): Promise<void> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: subscribers } = await supabase
    .from("veille_subscribers")
    .select("email")
    .is("unsubscribed_at", null);

  if (!subscribers || subscribers.length === 0) {
    return;
  }

  const transporter = createSmtpTransporter();
  const label = input.type === "article" ? "Nouvel article" : "Nouvelle vidéo";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Each recipient gets their own unsubscribe token and its own send, so one
  // failure never affects another subscriber and no email exposes the
  // others' addresses in "to".
  await Promise.all(
    subscribers.map(async (subscriber: { email: string }) => {
      const token = createUnsubscribeToken(subscriber.email);
      const html = await render(
        VeilleNotificationEmail({
          title: input.title,
          excerpt: input.excerpt,
          url: input.url,
          unsubscribeUrl: `${appUrl}/veille/unsubscribe?token=${token}`,
        })
      );
      return transporter.sendMail({
        from: process.env.SMTP_FROM!,
        to: subscriber.email,
        subject: `${label} Veille.BRVM : ${input.title}`,
        html,
      });
    })
  );
}

export async function sendDivialerteAlert(input: DivialerteAlertInput): Promise<void> {
  const transporter = createSmtpTransporter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const subject =
    input.daysLeft <= 1
      ? `Dividende ${input.companyName} demain`
      : `Dividende ${input.companyName} dans ${input.daysLeft} jours`;

  const html = await render(
    DivialerteAlertEmail({
      companyName: input.companyName,
      montant: input.montant,
      montantNet: input.montantNet,
      rendement: input.rendement,
      dateDetachement: input.dateDetachement,
      datePaiement: input.datePaiement,
      daysLeft: input.daysLeft,
      appUrl,
    })
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: input.email,
    subject,
    html,
  });
}
