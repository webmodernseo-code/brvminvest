// web/lib/unsubscribeToken.ts
import { createHmac } from "crypto";

export function createUnsubscribeToken(email: string): string {
  const hmac = createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!);
  hmac.update(email);
  const signature = hmac.digest("hex");
  return Buffer.from(`${email}:${signature}`).toString("base64url");
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [email, signature] = decoded.split(":");
    return signature && createUnsubscribeToken(email) === token ? email : null;
  } catch {
    return null;
  }
}
