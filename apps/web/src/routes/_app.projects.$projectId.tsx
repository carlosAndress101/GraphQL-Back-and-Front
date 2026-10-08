import { useState } from "react";
import type { FormEvent } from "react";
import { projectQueryOptions, useProject, useUpdateProject } from "../features/projects/hooks.ts";
import {
  useCreateTask,
  useProjectTasks,
  useSetTaskCompleted,
  useUpdateTask,
} from "../features/tasks/hooks.ts";
import { InlineEditor } from "./-inline-editor.tsx";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects/$projectId")({
  beforeLoad: async ({ context, params }) => {
    const project = await context.queryClient.fetchQuery(projectQueryOptions(params.projectId));
    if (!project.project) throw notFound();
  },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const [completedFilter, setCompletedFilter] = useState<boolean | null>(null);
  const projectQuery = useProject(projectId);
  const project = projectQuery.data?.project;
  const tasks = useProjectTasks(projectId, completedFilter);
  const updateProject = useUpdateProject();
  const updateTask = useUpdateTask();
  const setTaskCompleted = useSetTaskCompleted();
  const createTask = useCreateTask();
  const [newTaskTitle, setNewTaskTitle] = useState("");

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    createTask.mutate({ input: { projectId, title } }, { onSuccess: () => setNewTaskTitle("") });
  }

  if (projectQuery.isPending) {
    return <output className="block p-8 text-muted">Loading project…</output>;
  }
  if (projectQuery.isError) {
    return (
      <section className="p-8 text-text" role="alert">
        <h1 className="text-2xl font-semibold">Project could not be loaded</h1>
        <p className="mt-2 text-muted">{projectQuery.error.message}</p>
        <button
          className="mt-4 text-accent underline"
          onClick={() => void projectQuery.refetch()}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }
  if (!project) {
    return (
      <section className="p-8 text-text">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <Link className="mt-4 inline-block text-accent underline" to="/projects">
          Return to projects
        </Link>
      </section>
    );
  }

  const taskItems = tasks.data?.pages.flatMap((page) => page.project?.tasks.items ?? []) ?? [];
  const taskCounts = project.taskCounts;
  const progressMaximum = Math.max(taskCounts.total, 1);

  return (
    <article className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-10 sm:py-12">
      <header className="mb-8 border-b border-border pb-5">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
          <Link className="underline hover:text-text" to="/projects">
            Projects
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span aria-current="page">{project.name}</span>
        </nav>
        <InlineEditor
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          label="project name"
          onSave={(name) => {
            if (name && name !== project.name) {
              updateProject.mutate({ id: project.id, input: { name } });
            }
          }}
          value={project.name}
        />
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm sm:max-w-lg">
          <dt className="text-muted">Progress</dt>
          <dd className="flex flex-wrap items-center gap-3">
            <progress
              aria-label={`${taskCounts.completed} of ${taskCounts.total} tasks completed`}
              className="h-2 w-40 accent-accent"
              max={progressMaximum}
              value={taskCounts.completed}
            />
            <span>
              {taskCounts.completed} of {taskCounts.total} done
            </span>
          </dd>
          <dt className="text-muted">Created</dt>
          <dd>{new Date(project.createdAt).toLocaleDateString()}</dd>
        </dl>
        <div className="mt-6 max-w-2xl">
          <InlineEditor
            className="text-base leading-7 text-muted"
            label="project description"
            multiline
            onSave={(description) => {
              const nextDescription = description.trim() || null;
              if (nextDescription !== project.description) {
                updateProject.mutate({ id: project.id, input: { description: nextDescription } });
              }
            }}
            placeholder="Add a description…"
            value={project.description ?? ""}
          />
        </div>
        {updateProject.error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {updateProject.error.message}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="tasks-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" id="tasks-heading">
              Tasks
            </h2>
            <p className="mt-1 text-sm text-muted">Keep the next steps visible and in order.</p>
          </div>
          <fieldset className="m-0 flex gap-1 border-0 border-b border-border p-0">
            <legend className="sr-only">Task filter</legend>
            <TaskFilterButton
              active={completedFilter === null}
              onClick={() => setCompletedFilter(null)}
            >
              All
            </TaskFilterButton>
            <TaskFilterButton
              active={completedFilter === false}
              onClick={() => setCompletedFilter(false)}
            >
              Open
            </TaskFilterButton>
            <TaskFilterButton
              active={completedFilter === true}
              onClick={() => setCompletedFilter(true)}
            >
              Done
            </TaskFilterButton>
          </fieldset>
        </div>

        {tasks.isPending ? <output className="block py-8 text-muted">Loading tasks…</output> : null}
        {tasks.isError ? (
          <div className="py-6 text-sm text-danger" role="alert">
            <p>Tasks could not be loaded.</p>
            <button className="mt-1 underline" onClick={() => void tasks.refetch()} type="button">
              Try again
            </button>
          </div>
        ) : null}
        {tasks.isSuccess && taskItems.length === 0 ? (
          <p className="py-8 text-muted">
            {completedFilter === true
              ? "No completed tasks yet."
              : completedFilter === false
                ? "All tasks are complete."
                : "No tasks yet. Add the first one below."}
          </p>
        ) : null}
        {taskItems.length > 0 ? (
          <ul className="my-4 divide-y divide-border">
            {taskItems.map((task) => (
              <li className="flex min-h-12 items-center gap-3 py-2" key={task.id}>
                <input
                  aria-label={`${task.completed ? "Mark as open" : "Mark as done"}: ${task.title}`}
                  checked={task.completed}
                  className="size-5 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-accent"
                  onChange={(event) =>
                    setTaskCompleted.mutate({
                      projectId,
                      id: task.id,
                      completed: event.currentTarget.checked,
                    })
                  }
                  type="checkbox"
                />
                <InlineEditor
                  className={task.completed ? "flex-1 text-muted line-through" : "flex-1 text-text"}
                  label={`task ${task.title}`}
                  onSave={(title) => {
                    if (title && title !== task.title) {
                      updateTask.mutate({ projectId, id: task.id, input: { title } });
                    }
                  }}
                  value={task.title}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {tasks.hasNextPage ? (
          <button
            className="mb-4 rounded-md px-3 py-2 text-sm text-muted underline hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            disabled={tasks.isFetchingNextPage}
            onClick={() => void tasks.fetchNextPage()}
            type="button"
          >
            {tasks.isFetchingNextPage ? "Loading…" : "Load more tasks"}
          </button>
        ) : null}
        <form className="flex gap-3 border-t border-border pt-3" onSubmit={addTask}>
          <label className="sr-only" htmlFor="new-task-title">
            New task
          </label>
          <input
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
            id="new-task-title"
            onChange={(event) => setNewTaskTitle(event.currentTarget.value)}
            placeholder="Add a task… press Enter to save"
            required
            value={newTaskTitle}
          />
          <button
            className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-accent hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
            disabled={createTask.isPending}
            type="submit"
          >
            {createTask.isPending ? "Adding…" : "Add task"}
          </button>
        </form>
        {createTask.error || updateTask.error || setTaskCompleted.error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {(createTask.error ?? updateTask.error ?? setTaskCompleted.error)?.message}
          </p>
        ) : null}
      </section>
    </article>
  );
}

type TaskFilterButtonProps = {
  active: boolean;
  children: string;
  onClick: () => void;
};

function TaskFilterButton({ active, children, onClick }: TaskFilterButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-10 rounded-t-md px-3 py-2 text-sm ${active ? "bg-selected text-text" : "text-muted hover:bg-hover"} focus-visible:outline-2 focus-visible:outline-accent`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
