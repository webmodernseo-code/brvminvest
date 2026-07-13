import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
  padding?: number;
}

export function Card({ raised = false, padding = 16, className = "", style, ...props }: CardProps) {
  return (
    <div
      className={[
        raised ? "bg-surface-card-raised shadow-sm" : "bg-surface-card",
        "border border-border-subtle rounded-m",
        className,
      ].join(" ")}
      style={{ padding, ...style }}
      {...props}
    />
  );
}
