import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "accueil", href: "/", label: "Accueil", icon: "home" },
  { id: "veille", href: "/veille", label: "Veille", icon: "telescope" },
  { id: "divialerte", href: "/divialerte", label: "DiviAlerte", icon: "bell" },
  { id: "gestia", href: "/gestia", label: "Gestia", icon: "lock" },
];

const HIDDEN_ROUTES = new Set([
  "/login",
  "/signup",
  "/veille/unsubscribe",
  "/forgot-password",
  "/reset-password",
]);

export function isNavHidden(pathname: string): boolean {
  return HIDDEN_ROUTES.has(pathname);
}

export function getActiveNavId(pathname: string): string | null {
  if (isNavHidden(pathname)) {
    return null;
  }
  if (pathname === "/") {
    return "accueil";
  }
  const match = NAV_ITEMS.find((item) => item.id !== "accueil" && pathname.startsWith(item.href));
  return match ? match.id : null;
}
