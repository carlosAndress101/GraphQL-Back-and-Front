import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button.tsx";
import { Checkbox } from "../components/ui/Checkbox.tsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { ErrorState } from "../components/ui/ErrorState.tsx";
import { IconButton } from "../components/ui/IconButton.tsx";
import { MoreIcon, TrashIcon } from "../components/ui/icons.tsx";
import { InlineEditable } from "../components/ui/InlineEditable.tsx";
import { ProgressBar } from "../components/ui/ProgressBar.tsx";
import { Skeleton } from "../components/ui/Skeleton.tsx";
import { Tabs } from "../components/ui/Tabs.tsx";
import { useToast } from "../components/ui/Toast.tsx";
import { PageHeader, PropertyRow } from "../components/layout/PageHeader.tsx";
import { Topbar } from "../components/layout/Topbar.tsx";
import {
  useDeleteProject,
  projectQueryOptions,
  useProject,
  useUpdateProject,
} from "../features/projects/hooks.ts";
import {
  useCreateTask,
  useDeleteTask,
  useProjectTasks,
  useSetTaskCompleted,
  useUpdateTask,
} from "../features/tasks/hooks.ts";
import { mutationErrorMessage } from "./-form-errors.ts";
import { completedFromFilter, validateProjectSearch } from "./-project-search.ts";
import type { TaskFilter } from "./-project-search.ts";

export const Route = createFileRoute("/_app/projects/$projectId")({
  validateSearch: validateProjectSearch,
  beforeLoad: async ({ context, params }) => {
    const project = await context.queryClient.fetchQuery(projectQueryOptions(params.projectId));
    if (!project.project) throw notFound();
  },
  component: ProjectDetailPage,
});

const taskFilterTabs: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
];

const createdAtFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const toast = useToast();
  const titleContainerRef = useRef<HTMLDivElement>(null);

  const currentFilter = search.filter ?? "all";
  const projectQuery = useProject(projectId);
  const project = projectQuery.data?.project;
  const completedFilter = completedFromFilter(currentFilter);
  const tasks = useProjectTasks(projectId, completedFilter);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const updateTask = useUpdateTask();
  const setTaskCompleted = useSetTaskCompleted();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const didAutoEdit = useRef(false);

  useEffect(() => {
    if (didAutoEdit.current || search.edit !== "title") return;
    didAutoEdit.current = true;
    const trigger = titleContainerRef.current?.querySelector<HTMLButtonElement>(
      'button[aria-label="Edit project name"]',
    );
    trigger?.click();
    void navigate({
      to: "/projects/$projectId",
      params: { projectId },
      search: { filter: search.filter },
      replace: true,
    });
  }, [navigate, projectId, search.edit, search.filter]);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    createTask.mutate(
      { input: { projectId, title } },
      {
        onSuccess: () => setNewTaskTitle(""),
        onError: (error) => toast.error(mutationErrorMessage(error)),
      },
    );
  }

  function setFilter(filter: TaskFilter) {
    void navigate({
      to: "/projects/$projectId",
      params: { projectId },
      search: { filter },
    });
  }

  if (projectQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-8 py-14">
        <Skeleton lines={5} />
      </div>
    );
  }
  if (projectQuery.isError) {
    return (
      <ErrorState
        message={mutationErrorMessage(projectQuery.error)}
        onRetry={() => void projectQuery.refetch()}
      />
    );
  }
  if (!project) {
    return (
      <EmptyState
        action={
          <Link className="text-accent underline" to="/projects">
            Return to projects
          </Link>
        }
        title="Project not found"
      />
    );
  }

  const taskItems = tasks.data?.pages.flatMap((page) => page.project?.tasks.items ?? []) ?? [];
  const taskCounts = project.taskCounts;

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        right={
          <IconButton label="More actions" onClick={() => setConfirmingDelete(true)}>
            <MoreIcon className="h-4 w-4" />
          </IconButton>
        }
        trail={[{ label: "Projects" }, { label: project.name, current: true }]}
      />
      <ConfirmDialog
        confirmLabel="Delete"
        description={`"${project.name}" and all of its tasks will be permanently deleted.`}
        destructive
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteProject.mutate(
            { id: project.id },
            {
              onSuccess: () => {
                toast.success("Project deleted");
                void navigate({ to: "/projects" });
              },
              onError: (error) => toast.error(mutationErrorMessage(error)),
            },
          );
        }}
        open={confirmingDelete}
        title="Delete this project?"
      />

      <PageHeader
        title={
          <div ref={titleContainerRef}>
            <InlineEditable
              label="project name"
              onSave={(name) => {
                const trimmed = name.trim();
                if (!trimmed || trimmed === project.name) return;
                updateProject.mutate(
                  { id: project.id, input: { name: trimmed } },
                  { onError: (error) => toast.error(mutationErrorMessage(error)) },
                );
              }}
              value={project.name}
            />
          </div>
        }
      >
        <PropertyRow label="Progress">
          <div className="flex items-center gap-3">
            <ProgressBar
              className="w-40"
              label={`${taskCounts.completed} of ${taskCounts.total} tasks completed`}
              max={Math.max(taskCounts.total, 1)}
              value={taskCounts.completed}
            />
            <span className="text-sm text-muted">
              {taskCounts.completed} of {taskCounts.total} done
            </span>
          </div>
        </PropertyRow>
        <PropertyRow label="Created">{createdAtFormatter.format(new Date(project.createdAt))}</PropertyRow>

        <InlineEditable
          className="text-base leading-7 text-muted"
          label="project description"
          multiline
          onSave={(description) => {
            const next = description.trim() || null;
            if (next === (project.description ?? null)) return;
            updateProject.mutate(
              { id: project.id, input: { description: next } },
              { onError: (error) => toast.error(mutationErrorMessage(error)) },
            );
          }}
          placeholder="Add a description"
          value={project.description ?? ""}
        />

        <Tabs label="Task view" onChange={(id) => setFilter(id as TaskFilter)} tabs={taskFilterTabs} value={currentFilter} />

        {tasks.isPending ? <Skeleton lines={4} /> : null}
        {tasks.isError ? (
          <ErrorState message={mutationErrorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />
        ) : null}
        {tasks.isSuccess && taskItems.length === 0 ? (
          <EmptyState
            title={
              currentFilter === "done"
                ? "No completed tasks yet"
                : currentFilter === "open"
                  ? "All tasks are complete"
                  : "No tasks yet"
            }
            text={currentFilter === "all" ? "Add the first one below." : undefined}
          />
        ) : null}

        {taskItems.length > 0 ? (
          <ul className="flex flex-col">
            {taskItems.map((task) => (
              <li
                className="group flex min-h-9 items-center gap-2.5 rounded px-1 py-0.5 hover:bg-hover focus-within:bg-hover"
                key={task.id}
              >
                <Checkbox
                  aria-label={task.completed ? `Mark as open: ${task.title}` : `Mark as done: ${task.title}`}
                  checked={task.completed}
                  onChange={(event) =>
                    setTaskCompleted.mutate(
                      { projectId, id: task.id, completed: event.currentTarget.checked },
                      { onError: (error) => toast.error(mutationErrorMessage(error)) },
                    )
                  }
                />
                <InlineEditable
                  className={task.completed ? "flex-1 text-base text-muted line-through" : "flex-1 text-base text-text"}
                  label={`task ${task.title}`}
                  onSave={(title) => {
                    const trimmed = title.trim();
                    if (!trimmed || trimmed === task.title) return;
                    updateTask.mutate(
                      { projectId, id: task.id, input: { title: trimmed } },
                      { onError: (error) => toast.error(mutationErrorMessage(error)) },
                    );
                  }}
                  value={task.title}
                />
                <span className="opacity-0 focus-within:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100">
                  <IconButton
                    label={`Delete task: ${task.title}`}
                    onClick={() =>
                      deleteTask.mutate(
                        { projectId, id: task.id },
                        {
                          onSuccess: () => toast.success("Task deleted"),
                          onError: (error) => toast.error(mutationErrorMessage(error)),
                        },
                      )
                    }
                    size="sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </IconButton>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {tasks.hasNextPage ? (
          <Button
            disabled={tasks.isFetchingNextPage}
            loading={tasks.isFetchingNextPage}
            onClick={() => void tasks.fetchNextPage()}
            size="sm"
            variant="ghost"
          >
            Load more
          </Button>
        ) : null}

        <form className="flex items-center gap-2.5 border-t border-border px-1 pt-2" onSubmit={addTask}>
          <span aria-hidden="true" className="h-4 w-4 shrink-0" />
          <label className="sr-only" htmlFor="new-task-title">
            New task
          </label>
          <input
            className="min-h-9 min-w-0 flex-1 border-0 bg-transparent text-base text-text placeholder:text-subtle focus-visible:outline-none"
            id="new-task-title"
            onChange={(event) => setNewTaskTitle(event.currentTarget.value)}
            placeholder="Add a task… press Enter to save"
            value={newTaskTitle}
          />
          <Button disabled={createTask.isPending || !newTaskTitle.trim()} size="sm" type="submit" variant="ghost">
            Add
          </Button>
        </form>
      </PageHeader>
    </div>
  );
}
