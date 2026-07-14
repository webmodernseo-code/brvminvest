import Link from "next/link";

export function BackHomeLink() {
  return (
    <Link href="/" className="text-sm font-semibold text-text-secondary hover:text-text-primary">
      ← Accueil
    </Link>
  );
}
