import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectQuery } from "../gql/graphql.ts";
import { meQueryOptions } from "../features/auth/hooks.ts";
import { projectQueryOptions, projectsQueryOptions } from "../features/projects/hooks.ts";
import { GraphQLRequestError } from "../lib/graphql.ts";
import { createAppRouter, createAppRuntime } from "./-router.ts";

function clientWithNoSession() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(meQueryOptions().queryKey, { me: null });
  return queryClient;
}

function seedSignedInClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(meQueryOptions().queryKey, {
    me: { id: "user-1", email: "user@example.com" },
  });
  queryClient.setQueryData(projectsQueryOptions().queryKey, {
    pages: [{ projects: { items: [], nextCursor: null } }],
    pageParams: [null],
  });
  return queryClient;
}

function seedClientWithProject() {
  const queryClient = seedSignedInClient();
  const project: NonNullable<ProjectQuery["project"]> = {
    id: "project-1",
    name: "First project",
    description: null,
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T10:00:00.000Z",
    taskCounts: { total: 0, completed: 0 },
  };
  queryClient.setQueryData(projectsQueryOptions().queryKey, {
    pages: [{ projects: { items: [project], nextCursor: null } }],
    pageParams: [null],
  });
  queryClient.setQueryData(projectQueryOptions(project.id).queryKey, { project });
  return queryClient;
}

function mockMeRequest(): void {
  vi.stubEnv("VITE_API_URL", "http://localhost:4000/graphql");
  vi.stubEnv("DEV", true);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { me: null } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("authentication route guards", () => {
  it("redirects an unauthenticated deep link to login with its path preserved", async () => {
    const history = createMemoryHistory({ initialEntries: ["/projects/project-42?filter=open"] });
    const router = createAppRouter(clientWithNoSession(), history);

    await router.load();

    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search.redirect).toBe("/projects/project-42?filter=open");
  });

  it.each(["/login", "/signup"])("redirects a signed-in visitor from %s", async (path) => {
    const history = createMemoryHistory({ initialEntries: [path] });
    const router = createAppRouter(seedSignedInClient(), history);

    await router.load();

    expect(router.state.location.pathname).toBe("/projects");
  });

  it("redirects the projects index to the first project's document page", async () => {
    const history = createMemoryHistory({ initialEntries: ["/projects"] });
    const router = createAppRouter(seedClientWithProject(), history);

    await router.load();

    expect(router.state.location.pathname).toBe("/projects/project-1");
  });

  it("redirects the root route to the projects index when the workspace is empty", async () => {
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createAppRouter(seedSignedInClient(), history);

    await router.load();

    expect(router.state.location.pathname).toBe("/projects");
  });

  it("clears the query cache and navigates to login after a global unauthenticated error", async () => {
    mockMeRequest();
    const history = createMemoryHistory({ initialEntries: ["/projects/project-42"] });
    const { router, queryClient } = createAppRuntime(history);
    queryClient.setQueryData(meQueryOptions().queryKey, {
      me: { id: "user-1", email: "user@example.com" },
    });
    queryClient.setQueryData(projectsQueryOptions().queryKey, {
      pages: [{ projects: { items: [], nextCursor: null } }],
      pageParams: [null],
    });
    const project: ProjectQuery = {
      project: {
        id: "project-42",
        name: "Route guard test",
        description: null,
        createdAt: "2026-10-08T10:00:00.000Z",
        updatedAt: "2026-10-08T10:00:00.000Z",
        taskCounts: { total: 0, completed: 0 },
      },
    };
    queryClient.setQueryData(projectQueryOptions("project-42").queryKey, project);

    await router.load();
    expect(router.state.location.pathname).toBe("/projects/project-42");

    await expect(
      queryClient.fetchQuery({
        queryKey: ["test", "expired-session"],
        queryFn: async () => {
          throw new GraphQLRequestError("UNAUTHENTICATED", "Session expired");
        },
      }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search.redirect).toBe("/projects/project-42");
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
  });
});
