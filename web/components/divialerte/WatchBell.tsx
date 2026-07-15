"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface WatchBellProps {
  companyId: string;
  initiallyWatching: boolean;
  loggedIn: boolean;
}

export function WatchBell({ companyId, initiallyWatching, loggedIn }: WatchBellProps) {
  const router = useRouter();
  const [watching, setWatching] = useState(initiallyWatching);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!loggedIn) {
      router.push("/login?redirectTo=/divialerte");
      return;
    }

    const previous = watching;
    setWatching(!previous);
    setPending(true);

    try {
      const response = await fetch("/api/divialerte/watchlist", {
        method: "POST",
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        setWatching(previous);
      }
    } catch {
      setWatching(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} aria-label="Suivre">
      <Icon name="bell" size={18} color={watching ? "var(--action-primary)" : "var(--text-tertiary)"} />
    </button>
  );
}
