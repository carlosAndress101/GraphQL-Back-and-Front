import type { ButtonHTMLAttributes, ReactNode } from "react";

const sizes = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
} as const;

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Accessible name, rendered as aria-label. Required. */
  label: string;
  size?: keyof typeof sizes;
  children: ReactNode;
};

export function IconButton({ label, size = "md", children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]}`}
      {...rest}
    >
      {children}
    </button>
  );
}
