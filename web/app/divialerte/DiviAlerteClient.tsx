"use client";

import { useState } from "react";
import Link from "next/link";
import { DividendCard, type DividendCardData } from "@/components/divialerte/DividendCard";

type DiviAlerteTab = "toutes" | "suivies";

export function DiviAlerteClient({
  loggedIn,
  watchedCompanyIds,
  dividends,
}: {
  loggedIn: boolean;
  watchedCompanyIds: string[];
  dividends: DividendCardData[];
}) {
  const [tab, setTab] = useState<DiviAlerteTab>("toutes");
  const watchedSet = new Set(watchedCompanyIds);

  const visibleDividends =
    tab === "toutes" ? dividends : dividends.filter((d) => watchedSet.has(d.companyId));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">DiviAlerte</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("toutes")}
          className={[
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            tab === "toutes" ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
          ].join(" ")}
        >
          Toutes
        </button>
        <button
          type="button"
          onClick={() => setTab("suivies")}
          className={[
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            tab === "suivies" ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
          ].join(" ")}
        >
          Suivies
        </button>
      </div>

      {tab === "suivies" && !loggedIn ? (
        <div className="flex flex-col items-center gap-3 rounded-m border border-border-subtle p-8 text-center">
          <p className="text-text-secondary">Connectez-vous pour suivre des dividendes.</p>
          <Link href="/login?redirectTo=/divialerte" className="font-semibold text-text-primary underline">
            Se connecter
          </Link>
        </div>
      ) : visibleDividends.length === 0 ? (
        <p className="text-center text-text-tertiary">Aucun dividende à venir actuellement.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleDividends.map((dividend) => (
            <DividendCard
              key={dividend.companyId}
              dividend={dividend}
              loggedIn={loggedIn}
              isWatching={watchedSet.has(dividend.companyId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
