// web/lib/resend.ts
import { Resend } from "resend";
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

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const label = input.type === "article" ? "Nouvel article" : "Nouvelle vidéo";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Each recipient gets their own unsubscribe token, so one send never affects
  // another subscriber and no email exposes the others' addresses in "to".
  const emails = await Promise.all(
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
      return {
        from: "Veille.BRVM <veille@brvm-app.com>",
        to: [subscriber.email as string],
        subject: `${label} Veille.BRVM : ${input.title}`,
        html,
      };
    })
  );

  await resend.batch.send(emails);
}
