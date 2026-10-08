import { useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { PageIcon } from "../components/ui/icons.tsx";
import { TextField } from "../components/ui/TextField.tsx";
import { useToast } from "../components/ui/Toast.tsx";
import { useCreateProject, projectsQueryOptions } from "../features/projects/hooks.ts";
import { mutationErrorMessage } from "./-form-errors.ts";

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
  const toast = useToast();
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
        onError: (error) => toast.error(mutationErrorMessage(error)),
      },
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <EmptyState
        action={
          <form className="mt-2 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submit}>
            <div className="flex-1">
              <TextField
                label="Project name"
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="e.g. Website redesign"
                required
                value={name}
              />
            </div>
            <Button disabled={createProject.isPending} loading={createProject.isPending} type="submit">
              Create project
            </Button>
          </form>
        }
        icon={<PageIcon className="h-8 w-8" />}
        text="Give your work a home. Add tasks, update details, and keep everything in one place."
        title="Create your first project"
      />
    </div>
  );
}
