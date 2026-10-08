import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "./-router.ts";

type ServerTask = { id: string; title: string; completed: boolean };
type GraphQLBody = { query: string; variables?: Record<string, unknown> };

function stubDialog() {
  window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

function createFakeServer() {
  const project = {
    id: "project-1",
    name: "Website redesign",
    description: null as string | null,
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T10:00:00.000Z",
  };
  let tasks: ServerTask[] = [
    { id: "task-1", title: "Audit current site content", completed: true },
    { id: "task-2", title: "Build landing page components", completed: false },
  ];
  let nextId = 3;
  let deleted = false;
  let failNextSetCompleted = false;

  function taskCounts() {
    return { total: tasks.length, completed: tasks.filter((task) => task.completed).length };
  }

  function projectPayload() {
    return { ...project, taskCounts: taskCounts() };
  }

  function taskRecord(task: ServerTask) {
    return {
      id: task.id,
      title: task.title,
      completed: task.completed,
      createdAt: project.createdAt,
      updatedAt: project.createdAt,
      project: { id: project.id },
    };
  }

  function filteredTasks(completed: unknown) {
    if (completed === true) return tasks.filter((task) => task.completed);
    if (completed === false) return tasks.filter((task) => !task.completed);
    return tasks;
  }

  async function handle(body: GraphQLBody): Promise<{ data?: unknown; errors?: unknown[] }> {
    const query = body.query;
    const variables = body.variables ?? {};

    if (query.includes("query Me")) {
      return { data: { me: { id: "user-1", email: "ana@example.com" } } };
    }
    if (query.includes("query Projects")) {
      return { data: { projects: { items: deleted ? [] : [projectPayload()], nextCursor: null } } };
    }
    if (query.includes("query Project(")) {
      return { data: { project: deleted ? null : projectPayload() } };
    }
    if (query.includes("query ProjectTasks")) {
      return {
        data: {
          project: {
            id: project.id,
            tasks: { items: filteredTasks(variables.completed).map(taskRecord), nextCursor: null },
          },
        },
      };
    }
    if (query.includes("mutation SetTaskCompleted")) {
      if (failNextSetCompleted) {
        failNextSetCompleted = false;
        return {
          errors: [{ message: "Completion failed", extensions: { code: "INTERNAL_SERVER_ERROR" } }],
        };
      }
      const task = tasks.find((candidate) => candidate.id === variables.id);
      if (!task) throw new Error("Unknown task in test fixture");
      task.completed = Boolean(variables.completed);
      return { data: { setTaskCompleted: taskRecord(task) } };
    }
    if (query.includes("mutation CreateTask")) {
      const input = variables.input as { title: string };
      const task: ServerTask = { id: `task-${nextId}`, title: input.title, completed: false };
      nextId += 1;
      tasks = [...tasks, task];
      return { data: { createTask: taskRecord(task) } };
    }
    if (query.includes("mutation DeleteTask")) {
      tasks = tasks.filter((task) => task.id !== variables.id);
      return { data: { deleteTask: true } };
    }
    if (query.includes("mutation UpdateProject")) {
      Object.assign(project, variables.input);
      return { data: { updateProject: projectPayload() } };
    }
    if (query.includes("mutation DeleteProject")) {
      deleted = true;
      return { data: { deleteProject: true } };
    }

    throw new Error(`Unhandled GraphQL operation in test: ${query.slice(0, 60)}`);
  }

  return {
    handle,
    failNextSetCompleted: (value: boolean) => {
      failNextSetCompleted = value;
    },
  };
}

function renderApp(initialPath: string) {
  const server = createFakeServer();
  vi.stubEnv("VITE_API_URL", "http://localhost:4000/graphql");
  vi.stubEnv("DEV", true);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as GraphQLBody;
      const payload = await server.handle(body);
      // A tiny delay keeps mutations from settling before React commits the
      // optimistic update, so tests can observe it in between.
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createAppRouter(queryClient, history);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, server };
}

describe("project detail page", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders the project's tasks", async () => {
    renderApp("/projects/project-1");
    expect(await screen.findByText("Audit current site content")).toBeInTheDocument();
    expect(screen.getByText("Build landing page components")).toBeInTheDocument();
  });

  it("toggles a task optimistically and rolls back with an error toast on failure", async () => {
    const user = userEvent.setup();
    const { server } = renderApp("/projects/project-1");
    server.failNextSetCompleted(true);

    const checkbox = await screen.findByRole("checkbox", {
      name: "Mark as done: Build landing page components",
    });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());

    expect(await screen.findByText("Completion failed")).toBeInTheDocument();
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it("creates a task by pressing Enter and keeps focus on the input", async () => {
    const user = userEvent.setup();
    renderApp("/projects/project-1");
    const input = await screen.findByPlaceholderText("Add a task… press Enter to save");

    await user.click(input);
    await user.type(input, "Set up redirects from old URLs{Enter}");

    expect(await screen.findByText("Set up redirects from old URLs")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("updates the URL when switching task filter tabs", async () => {
    const { router } = renderApp("/projects/project-1");
    await screen.findByText("Audit current site content");

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Open" }));

    await waitFor(() => expect(router.state.location.search.filter).toBe("open"));
    expect(await screen.findByText("Build landing page components")).toBeInTheDocument();
    expect(screen.queryByText("Audit current site content")).not.toBeInTheDocument();
  });

  it("opens the title already in edit mode when navigated with ?edit=title, then strips the flag", async () => {
    const { router } = renderApp("/projects/project-1?edit=title");

    const titleField = await screen.findByRole("textbox", { name: "project name" });
    expect(titleField).toHaveFocus();
    expect(titleField).toHaveValue("Website redesign");

    await waitFor(() => expect(router.state.location.search.edit).toBeUndefined());
    expect(router.state.location.pathname).toBe("/projects/project-1");
  });

  it("deletes a project through the confirm dialog, then navigates and toasts", async () => {
    stubDialog();
    const user = userEvent.setup();
    const { router } = renderApp("/projects/project-1");
    await screen.findByRole("button", { name: "More actions" });

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/projects"));
    expect(await screen.findByText("Project deleted")).toBeInTheDocument();
    expect(await screen.findByText("Create your first project")).toBeInTheDocument();
  });
});
