import type { InputHTMLAttributes, ReactNode } from "react";
import { CheckIcon } from "./icons.tsx";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
};

export function Checkbox({ label, disabled, className = "", ...rest }: CheckboxProps) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2.5 ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
    >
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input type="checkbox" disabled={disabled} className="peer sr-only" {...rest} />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded border border-subtle bg-surface transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        />
        <CheckIcon className="absolute inset-0 m-auto h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
      </span>
      {label != null && <span className="text-text">{label}</span>}
    </label>
  );
}
