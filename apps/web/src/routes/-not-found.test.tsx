import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { meQueryOptions } from "../features/auth/hooks.ts";
import { createAppRouter } from "./-router.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("not-found route", () => {
  it("shows a link back to the workspace for an unknown path", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:4000/graphql");
    vi.stubEnv("DEV", true);
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ data: { projects: { items: [], nextCursor: null } } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(meQueryOptions().queryKey, { me: { id: "user-1", email: "a@b.com" } });
    const history = createMemoryHistory({ initialEntries: ["/this-page-does-not-exist"] });
    const router = createAppRouter(queryClient, history);

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    const link = screen.getByRole("button", { name: "Return to projects" });

    const user = userEvent.setup();
    await user.click(link);
    expect(router.state.location.pathname).toBe("/projects");
  });
});
