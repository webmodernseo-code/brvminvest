import { ButtonHTMLAttributes } from "react";

interface TagProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Tag({ active = false, className = "", ...props }: TagProps) {
  return (
    <button
      type="button"
      className={[
        "h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold",
        active ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
