import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectTasksQuery } from "../../gql/graphql.ts";
import { queryKeys } from "../../lib/query-keys.ts";
import { useSetTaskCompleted } from "./hooks.ts";

type TaskPages = InfiniteData<ProjectTasksQuery, string | null>;

function firstTask(data: TaskPages | undefined) {
  return data?.pages[0]?.project?.tasks.items[0];
}

function queryWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function graphQLErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      errors: [{ message: "Completion failed", extensions: { code: "INTERNAL_SERVER_ERROR" } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("task mutation hooks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rolls back optimistic completion when the GraphQL request fails", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:4000/graphql");
    vi.stubEnv("DEV", true);
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const queryKey = queryKeys.tasks.list("project-1", false);
    const initialCache: TaskPages = {
      pages: [
        {
          project: {
            id: "project-1",
            tasks: {
              nextCursor: null,
              items: [
                {
                  id: "task-1",
                  title: "Prepare outline",
                  completed: false,
                  createdAt: "2026-10-08T10:00:00.000Z",
                  updatedAt: "2026-10-08T10:00:00.000Z",
                  project: { id: "project-1" },
                },
              ],
            },
          },
        },
      ],
      pageParams: [null],
    };
    queryClient.setQueryData(queryKey, initialCache);

    const { result } = renderHook(() => useSetTaskCompleted(), {
      wrapper: queryWrapper(queryClient),
    });
    result.current.mutate({ projectId: "project-1", id: "task-1", completed: true });

    await waitFor(() => {
      expect(firstTask(queryClient.getQueryData<TaskPages>(queryKey))).toBeUndefined();
    });

    if (!resolveFetch) throw new Error("Expected the GraphQL request to be pending.");
    resolveFetch(graphQLErrorResponse());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(firstTask(queryClient.getQueryData<TaskPages>(queryKey))).toMatchObject({
      id: "task-1",
      completed: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    queryClient.clear();
  });
});
