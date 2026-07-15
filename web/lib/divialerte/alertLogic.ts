export type AlertType = "j3" | "j1";

export function determineAlertsToSend(
  daysLeft: number | null,
  alreadySent: Set<AlertType>
): AlertType[] {
  if (daysLeft === null || daysLeft < 0) return [];

  const toSend: AlertType[] = [];
  if (daysLeft <= 3 && !alreadySent.has("j3")) toSend.push("j3");
  if (daysLeft <= 1 && !alreadySent.has("j1")) toSend.push("j1");
  return toSend;
}
