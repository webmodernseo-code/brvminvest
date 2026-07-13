// web/lib/validation.ts
export interface SignupInput {
  nom: string;
  prenom: string;
  email: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignupForm(input: SignupInput): string | null {
  if (!input.nom.trim()) return "Le nom est requis.";
  if (!input.prenom.trim()) return "Le prénom est requis.";
  if (!EMAIL_RE.test(input.email)) return "L'adresse email n'est pas valide.";
  if (input.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  return null;
}
