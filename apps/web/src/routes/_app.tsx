import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, createFileRoute, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { AppShell } from "../components/layout/AppShell.tsx";
import { Sidebar } from "../components/layout/Sidebar.tsx";
import type { SidebarProject } from "../components/layout/Sidebar.tsx";
import { useToast } from "../components/ui/Toast.tsx";
import { meQueryOptions, useMe, useSignOut } from "../features/auth/hooks.ts";
import { useCreateProject, useProjects } from "../features/projects/hooks.ts";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const result = await context.queryClient.fetchQuery(meQueryOptions());
    if (!result.me) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: ApplicationLayout,
});

function activeProjectId(pathname: string): string | undefined {
  return /^\/projects\/([^/]+)/.exec(pathname)?.[1];
}

function ApplicationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const me = useMe();
  const signOut = useSignOut();
  const createProject = useCreateProject();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const projects = useProjects(searchOpen ? searchTerm : "");

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const currentProjectId = activeProjectId(location.pathname);
  const projectItems = useMemo<SidebarProject[]>(
    () =>
      (projects.data?.pages.flatMap((page) => page.projects.items) ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        openCount: project.taskCounts.total - project.taskCounts.completed,
        active: project.id === currentProjectId,
      })),
    [projects.data, currentProjectId],
  );

  function createUntitledProject() {
    createProject.mutate(
      { input: { name: "Untitled", description: null } },
      {
        onSuccess: (data) =>
          void navigate({
            to: "/projects/$projectId",
            params: { projectId: data.createProject.id },
            search: { filter: "all", edit: "title" },
          }),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchTerm("");
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          onNewProject={createUntitledProject}
          onSearch={() => setSearchOpen(true)}
          onSignOut={() =>
            signOut.mutate(undefined, {
              onSuccess: () => void navigate({ to: "/login" }),
              onError: (error) => toast.error(error.message),
            })
          }
          hasMore={projects.hasNextPage}
          loadingMore={projects.isFetchingNextPage}
          onLoadMore={() => void projects.fetchNextPage()}
          projects={projectItems}
          renderLink={(item, content) => (
            <Link
              className="flex min-w-0 flex-1 items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-accent"
              params={{ projectId: item.id }}
              to="/projects/$projectId"
            >
              {content}
            </Link>
          )}
          searchSlot={
            searchOpen ? (
              <div className="px-1">
                <label className="sr-only" htmlFor="sidebar-search">
                  Search projects
                </label>
                <input
                  className="min-h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-accent"
                  id="sidebar-search"
                  onBlur={() => {
                    if (!searchTerm) closeSearch();
                  }}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") closeSearch();
                  }}
                  placeholder="Search projects…"
                  ref={searchInputRef}
                  value={searchTerm}
                />
              </div>
            ) : undefined
          }
          userEmail={me.data?.me?.email ?? ""}
          workspaceName="Workspace"
        />
      }
    >
      <Outlet />
    </AppShell>
  );
}
