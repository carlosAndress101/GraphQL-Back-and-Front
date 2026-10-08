import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "./-router.ts";

type GraphQLBody = { query: string; variables?: Record<string, unknown> };

function projectFixture(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T10:00:00.000Z",
    taskCounts: { total: 0, completed: 0 },
  };
}

function renderApp() {
  vi.stubEnv("VITE_API_URL", "http://localhost:4000/graphql");
  vi.stubEnv("DEV", true);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as GraphQLBody;
      const variables = body.variables ?? {};
      let data: unknown;

      if (body.query.includes("query Me")) {
        data = { me: { id: "user-1", email: "ana@example.com" } };
      } else if (body.query.includes("query Projects")) {
        data =
          variables.after === "page-1-cursor"
            ? { projects: { items: [projectFixture("project-2", "Mobile onboarding")], nextCursor: null } }
            : {
                projects: {
                  items: [projectFixture("project-1", "Website redesign")],
                  nextCursor: "page-1-cursor",
                },
              };
      } else if (body.query.includes("query Project(")) {
        data = { project: projectFixture("project-1", "Website redesign") };
      } else if (body.query.includes("query ProjectTasks")) {
        data = { project: { id: "project-1", tasks: { items: [], nextCursor: null } } };
      } else {
        throw new Error(`Unhandled GraphQL operation in test: ${body.query.slice(0, 60)}`);
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const history = createMemoryHistory({ initialEntries: ["/projects/project-1"] });
  const router = createAppRouter(queryClient, history);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("sidebar pagination", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("appends the next page of projects when Load more is clicked", async () => {
    renderApp();
    const nav = await screen.findByRole("navigation", { name: "Workspace" });

    expect(await within(nav).findByText("Website redesign")).toBeInTheDocument();
    expect(within(nav).queryByText("Mobile onboarding")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(within(nav).getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(within(nav).getByText("Mobile onboarding")).toBeInTheDocument());
    expect(within(nav).getByText("Website redesign")).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});
