"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface FavoriteButtonProps {
  contentType: "article" | "video";
  contentId: string;
  initiallyFavorited: boolean;
  loggedIn: boolean;
}

export function FavoriteButton({
  contentType,
  contentId,
  initiallyFavorited,
  loggedIn,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }

    const previous = favorited;
    setFavorited(!previous);
    setPending(true);

    try {
      const response = await fetch("/api/veille/favorites", {
        method: "POST",
        body: JSON.stringify({ contentType, contentId }),
      });

      if (!response.ok) {
        setFavorited(previous);
      }
    } catch {
      setFavorited(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} aria-label="Favori">
      <Icon
        name="star"
        size={18}
        color={favorited ? "var(--action-primary)" : "var(--text-tertiary)"}
      />
    </button>
  );
}
