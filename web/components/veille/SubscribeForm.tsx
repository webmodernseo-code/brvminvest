// web/components/veille/SubscribeForm.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "already" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/veille/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    const json = await response.json();
    setStatus(json.alreadySubscribed ? "already" : "done");
  }

  return (
    <Card padding={20}>
      <p className="font-semibold text-text-primary">Restez informé</p>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <div className="flex-1">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="s" disabled={status === "loading"}>
          S&apos;abonner
        </Button>
      </form>
      {status === "done" && <p className="mt-2 text-sm text-market-up">Inscription confirmée !</p>}
      {status === "already" && <p className="mt-2 text-sm text-text-tertiary">Vous êtes déjà abonné.</p>}
      {status === "error" && <p className="mt-2 text-sm text-market-down">Une erreur est survenue.</p>}
    </Card>
  );
}
