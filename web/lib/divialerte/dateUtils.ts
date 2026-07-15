export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function deriveExerciceYear(dateDetachement: string | null, now: Date = new Date()): number {
  if (dateDetachement) {
    return Number(dateDetachement.slice(0, 4));
  }
  return now.getUTCFullYear();
}
