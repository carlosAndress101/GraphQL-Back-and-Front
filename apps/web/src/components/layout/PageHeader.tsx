import type { ReactNode } from "react";

export type PageHeaderProps = {
  /** Big title slot — pass an h1 or an InlineEditable. */
  title: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({ title, children, className = "" }: PageHeaderProps) {
  return (
    <div className={`mx-auto box-border flex w-full max-w-[760px] flex-col gap-5 px-8 pb-16 pt-14 ${className}`}>
      <div className="text-[40px] font-bold leading-[1.2] text-text">{title}</div>
      {children}
    </div>
  );
}

export type PropertyRowProps = {
  label: string;
  children: ReactNode;
};

export function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-y-2 text-sm">
      <span className="text-muted">{label}</span>
      <div className="min-w-0 text-text">{children}</div>
    </div>
  );
}
