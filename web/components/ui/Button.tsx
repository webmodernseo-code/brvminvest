import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "success" | "danger";
type Size = "s" | "l";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-action-primary text-white hover:opacity-90",
  outline: "border border-border-default text-text-primary hover:bg-black/5",
  success: "bg-market-up text-white hover:opacity-90",
  danger: "bg-market-down text-white hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  s: "h-9 px-3 text-sm",
  l: "h-[52px] px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "l",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "rounded-m font-body font-semibold transition-colors",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      type={type}
      {...props}
    />
  );
}
