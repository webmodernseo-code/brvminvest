// web/components/veille/VeilleTabs.tsx
"use client";

import { useState } from "react";

export type VeilleTab = "articles" | "videos" | "favorites";

export function VeilleTabs({
  active,
  onChange,
}: {
  active: VeilleTab;
  onChange: (tab: VeilleTab) => void;
}) {
  const tabs: { id: VeilleTab; label: string }[] = [
    { id: "articles", label: "Articles" },
    { id: "videos", label: "Vidéos" },
    { id: "favorites", label: "Favoris" },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            active === tab.id ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
