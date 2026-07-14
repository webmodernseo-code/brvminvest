// web/lib/mailer.ts
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { VeilleNotificationEmail } from "@/emails/VeilleNotification";
import { createUnsubscribeToken } from "@/lib/unsubscribeToken";

interface NotificationInput {
  type: "article" | "video";
  title: string;
  excerpt: string;
  url: string;
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

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT!),
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
  });

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
