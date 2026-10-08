import type { ReactNode } from "react";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, text, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-2 px-6 py-12 text-center ${className}`}>
      {icon && (
        <span aria-hidden="true" className="text-subtle">
          {icon}
        </span>
      )}
      <p className="text-base font-medium text-text">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}
