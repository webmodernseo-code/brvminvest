"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { redirectMessage } from "@/lib/redirectMessage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BackHomeLink } from "@/components/ui/BackHomeLink";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const message = redirectMessage(searchParams.get("redirectTo"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("redirectTo") ?? "/";
    router.push(redirectTo);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <BackHomeLink />
      {message && <p className="text-sm text-text-secondary">{message}</p>}
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">
        Se connecter
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-market-down">{error}</p>}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Connexion..." : "Déverrouiller"}
        </Button>
      </form>
      <Link href="/forgot-password" className="text-sm font-semibold text-text-secondary hover:text-text-primary">
        Mot de passe oublié ?
      </Link>
      <Link href="/signup" className="text-sm font-semibold text-text-secondary hover:text-text-primary">
        Pas de compte ? Créer un compte
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6">Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
