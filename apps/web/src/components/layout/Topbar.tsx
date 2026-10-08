import { Fragment } from "react";
import type { ReactNode } from "react";

export type Breadcrumb = {
  label: string;
  current?: boolean;
};

export type TopbarProps = {
  trail: Breadcrumb[];
  right?: ReactNode;
};

export function Topbar({ trail, right }: TopbarProps) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <ol className="flex min-w-0 items-center gap-1.5">
          {trail.map((crumb, index) => (
            <Fragment key={`${index}-${crumb.label}`}>
              {index > 0 && (
                <li aria-hidden="true" className="select-none">
                  /
                </li>
              )}
              <li className="min-w-0">
                {crumb.current ? (
                  <span aria-current="page" className="truncate text-text">
                    {crumb.label}
                  </span>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
      {right && <div className="ml-auto flex shrink-0 items-center gap-1 text-[13px]">{right}</div>}
    </div>
  );
}
