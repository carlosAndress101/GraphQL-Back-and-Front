import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export type AppShellProps = {
  sidebar: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-surface text-text">
      <button
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((open) => !open)}
        className="fixed left-3 top-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-md bg-sidebar text-muted shadow-sm md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-black/40 md:hidden"
        />
      )}
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform bg-sidebar transition-transform md:static md:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
