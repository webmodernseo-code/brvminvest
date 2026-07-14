// web/app/veille/unsubscribe/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeStatus() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    fetch("/api/veille/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? "done" : "error"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  return (
    <>
      {status === "loading" && <p>Désabonnement en cours...</p>}
      {status === "done" && <p>Vous avez été désabonné des notifications Veille.BRVM.</p>}
      {status === "error" && <p className="text-market-down">Lien de désabonnement invalide.</p>}
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-2 p-6 text-center">
      <Suspense fallback={<p>Désabonnement en cours...</p>}>
        <UnsubscribeStatus />
      </Suspense>
    </div>
  );
}
