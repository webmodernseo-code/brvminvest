import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, className = "", id, ...props },
  ref
) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </span>
      <input
        ref={ref}
        id={inputId}
        className={[
          "h-14 rounded-m border border-border-default bg-surface-card px-3.5 font-body text-text-primary",
          className,
        ].join(" ")}
        {...props}
      />
    </label>
  );
});
