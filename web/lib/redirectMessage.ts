const REDIRECT_MESSAGES: Record<string, string> = {
  "/divialerte": "Connecte-toi pour accéder à DiviAlerte.",
  "/gestia": "Connecte-toi pour accéder à Gestia.BRVM.",
};

export function redirectMessage(redirectTo: string | null): string | null {
  if (!redirectTo) return null;
  const match = Object.keys(REDIRECT_MESSAGES).find((prefix) => redirectTo.startsWith(prefix));
  return match ? REDIRECT_MESSAGES[match] : null;
}
