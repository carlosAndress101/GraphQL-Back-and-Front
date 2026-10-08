import { useState } from "react";
import type { FormEvent } from "react";
import { useCreateProject, projectsQueryOptions } from "../features/projects/hooks.ts";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects/")({
  beforeLoad: async ({ context }) => {
    const projects = await context.queryClient.fetchInfiniteQuery(projectsQueryOptions());
    const firstProject = projects.pages[0]?.projects.items[0];
    if (firstProject) {
      throw redirect({ to: "/projects/$projectId", params: { projectId: firstProject.id } });
    }
  },
  component: EmptyProjectsPage,
});

function EmptyProjectsPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [name, setName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName) return;

    createProject.mutate(
      { input: { name: projectName, description: null } },
      {
        onSuccess: (data) =>
          void navigate({
            to: "/projects/$projectId",
            params: { projectId: data.createProject.id },
          }),
      },
    );
  }

  return (
    <article className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-12 text-text sm:px-10">
      <p className="text-sm font-medium text-accent">Your workspace</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Create your first project</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">
        Give your work a home. You can add tasks, update details, and keep everything in one place.
      </p>
      <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="first-project-name">
          Project name
        </label>
        <input
          className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
          id="first-project-name"
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="e.g. Website redesign"
          required
          value={name}
        />
        <button
          className="min-h-11 rounded-md bg-accent px-4 py-2 font-medium text-surface hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          disabled={createProject.isPending}
          type="submit"
        >
          {createProject.isPending ? "Creating…" : "Create project"}
        </button>
      </form>
      {createProject.error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {createProject.error.message}
        </p>
      ) : null}
    </article>
  );
}
