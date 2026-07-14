import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investir à la BRVM",
  description: "Veille, alertes de dividendes et gestion de portefeuille pour la BRVM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-surface-app font-body text-text-primary">{children}</body>
    </html>
  );
}
