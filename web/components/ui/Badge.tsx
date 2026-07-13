import { HTMLAttributes } from "react";

type Tone = "success" | "warning" | "error" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-[rgba(23,201,100,0.12)] text-market-up",
  warning: "bg-[rgba(47,107,79,0.12)] text-alert",
  error: "bg-[rgba(239,68,68,0.12)] text-market-down",
  neutral: "bg-black/5 text-text-secondary",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        toneClasses[tone],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
