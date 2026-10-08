import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
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

function ApplicationLayout() {
  const navigate = useNavigate();
  const me = useMe();
  const projects = useProjects();
  const signOut = useSignOut();
  const createProject = useCreateProject();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const projectItems = projects.data?.pages.flatMap((page) => page.projects.items) ?? [];

  function submitNewProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;

    createProject.mutate(
      { input: { name, description: null } },
      {
        onSuccess: (data) => {
          setIsCreatingProject(false);
          setNewProjectName("");
          void navigate({
            to: "/projects/$projectId",
            params: { projectId: data.createProject.id },
          });
        },
      },
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-sidebar p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <nav aria-label="Workspace" className="flex flex-col gap-1">
          <Link
            className="rounded-md px-3 py-2 font-semibold text-text hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
            to="/projects"
          >
            Workspace
          </Link>
          <h2 className="px-3 pt-5 text-xs font-semibold uppercase tracking-wide text-muted">
            Projects
          </h2>
          {projects.isPending ? (
            <p className="px-3 py-2 text-sm text-muted">Loading projects…</p>
          ) : null}
          {projects.isError ? (
            <div className="px-3 py-2 text-sm text-danger" role="alert">
              <p>Projects could not be loaded.</p>
              <button
                className="mt-1 underline"
                onClick={() => void projects.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : null}
          <ul className="flex flex-col gap-1">
            {projectItems.map((project) => (
              <li key={project.id}>
                <Link
                  activeProps={{ className: "bg-selected" }}
                  className="block truncate rounded-md px-3 py-2 text-sm text-text hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
                  params={{ projectId: project.id }}
                  to="/projects/$projectId"
                >
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
          {projects.hasNextPage ? (
            <button
              className="rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
              disabled={projects.isFetchingNextPage}
              onClick={() => void projects.fetchNextPage()}
              type="button"
            >
              {projects.isFetchingNextPage ? "Loading…" : "Load more projects"}
            </button>
          ) : null}
          {isCreatingProject ? (
            <form className="mt-2 flex flex-col gap-2 px-2" onSubmit={submitNewProject}>
              <label className="sr-only" htmlFor="sidebar-new-project">
                New project name
              </label>
              <input
                autoComplete="off"
                className="min-h-10 rounded-md border border-border bg-surface px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent"
                id="sidebar-new-project"
                onChange={(event) => setNewProjectName(event.currentTarget.value)}
                placeholder="Project name"
                required
                value={newProjectName}
              />
              <div className="flex gap-2">
                <button
                  className="min-h-10 flex-1 rounded-md bg-accent px-2 py-1 text-sm font-medium text-surface hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
                  disabled={createProject.isPending}
                  type="submit"
                >
                  {createProject.isPending ? "Creating…" : "Create"}
                </button>
                <button
                  className="min-h-10 rounded-md px-2 py-1 text-sm text-muted underline hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
                  onClick={() => setIsCreatingProject(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
              {createProject.error ? (
                <p className="text-sm text-danger" role="alert">
                  {createProject.error.message}
                </p>
              ) : null}
            </form>
          ) : (
            <button
              className="mt-2 min-h-10 rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-hover hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => setIsCreatingProject(true)}
              type="button"
            >
              + New project
            </button>
          )}
        </nav>
        <footer className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm md:mt-auto">
          <span className="min-w-0 truncate text-muted">{me.data?.me?.email ?? "Workspace"}</span>
          <button
            className="shrink-0 rounded-md px-2 py-1 text-muted underline hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            disabled={signOut.isPending}
            onClick={() =>
              signOut.mutate(undefined, {
                onSuccess: () => void navigate({ to: "/login" }),
              })
            }
            type="button"
          >
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </button>
        </footer>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
