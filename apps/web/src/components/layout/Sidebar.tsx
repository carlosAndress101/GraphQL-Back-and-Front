import type { ReactNode } from "react";
import { PageIcon, PlusIcon, SearchIcon } from "../ui/icons.tsx";

export type SidebarProject = {
  id: string;
  name: string;
  openCount: number;
  active: boolean;
};

export type SidebarProps = {
  workspaceName: string;
  onSearch: () => void;
  /** Overrides the built-in Search button when provided. */
  searchSlot?: ReactNode;
  projects: SidebarProject[];
  /** Renders the link for a project (router-agnostic). Honor `item.active` with `aria-current="page"`. */
  renderLink: (item: SidebarProject, content: ReactNode) => ReactNode;
  onNewProject: () => void;
  userEmail: string;
  onSignOut: () => void;
};

function ProjectContent({ item }: { item: SidebarProject }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <PageIcon className="h-4 w-4 shrink-0 text-muted" />
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      <span className="text-xs text-muted">{item.openCount}</span>
    </span>
  );
}

export function Sidebar({
  workspaceName,
  onSearch,
  searchSlot,
  projects,
  renderLink,
  onNewProject,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const initial = workspaceName.charAt(0).toUpperCase() || "?";

  return (
    <nav aria-label="Workspace" className="flex h-full flex-col gap-0.5 bg-sidebar px-2 py-3 text-sm">
      <div className="mb-2 flex items-center gap-2 px-2.5 py-1.5">
        <span
          aria-hidden="true"
          className="flex h-[22px] w-[22px] items-center justify-center rounded bg-text text-xs font-semibold text-surface"
        >
          {initial}
        </span>
        <span className="font-semibold text-text">{workspaceName}</span>
      </div>
      {searchSlot ?? (
        <button
          type="button"
          onClick={onSearch}
          className="flex min-h-8 items-center gap-2 rounded-md px-2.5 text-left text-muted transition-colors hover:bg-hover hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
        >
          <SearchIcon className="h-4 w-4" />
          Search
        </button>
      )}
      <p className="mx-2.5 mb-1 mt-3.5 text-xs font-semibold text-muted">Projects</p>
      <ul className="flex flex-col gap-0.5">
        {projects.map((item) => (
          <li
            key={item.id}
            className={`flex min-h-8 items-center gap-2 rounded-md px-2.5 transition-colors ${
              item.active ? "bg-selected text-text" : "text-text hover:bg-hover"
            }`}
          >
            {renderLink(item, <ProjectContent item={item} />)}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onNewProject}
        className="flex min-h-8 items-center gap-2 rounded-md px-2.5 text-left text-muted transition-colors hover:bg-hover hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
      >
        <PlusIcon className="h-4 w-4" />
        New project
      </button>
      <div className="mt-auto flex items-center gap-1 px-2.5 py-2 text-[13px] text-muted">
        <span className="min-w-0 flex-1 truncate">{userEmail}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
