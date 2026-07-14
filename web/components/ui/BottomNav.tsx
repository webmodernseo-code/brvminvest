"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { NAV_ITEMS, isNavHidden, getActiveNavId } from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();

  if (isNavHidden(pathname)) {
    return null;
  }

  const activeId = getActiveNavId(pathname);

  return (
    <>
      <div className="h-16" />
      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 border-t border-border-subtle bg-surface-card">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold",
                isActive ? "text-action-primary" : "text-text-tertiary",
              ].join(" ")}
            >
              <Icon name={item.icon} size={22} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
