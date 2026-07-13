import { LucideProps, Telescope, Bell, Lock, ChevronRight, ChevronDown, Search, ShieldCheck, Home, Briefcase, Star } from "lucide-react";

const registry = {
  telescope: Telescope,
  bell: Bell,
  lock: Lock,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  search: Search,
  "shield-check": ShieldCheck,
  home: Home,
  briefcase: Briefcase,
  star: Star,
} as const;

export type IconName = keyof typeof registry;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
  const Component = registry[name];
  return <Component {...props} />;
}
