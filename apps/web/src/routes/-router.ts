import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import type { RouterHistory } from "@tanstack/react-router";
import { createRouter } from "@tanstack/react-router";
import { GraphQLRequestError } from "../lib/graphql.ts";
import { routeTree } from "../routeTree.gen.ts";
import type { RouterContext } from "./__root.tsx";

type AppRouter = ReturnType<typeof createAppRouter>;
type Runtime = {
  queryClient?: QueryClient;
  router?: AppRouter;
};

function redirectOnUnauthenticated(error: unknown, runtime: Runtime): void {
  if (!(error instanceof GraphQLRequestError) || error.code !== "UNAUTHENTICATED") return;

  const queryClient = runtime.queryClient;
  if (!queryClient) return;
  queryClient.clear();

  const router = runtime.router;
  if (!router) return;
  const { pathname, searchStr } = router.state.location;
  if (pathname === "/login" || pathname === "/signup") return;

  void router.navigate({
    to: "/login",
    search: { redirect: `${pathname}${searchStr}` },
  });
}

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  const context: RouterContext = { queryClient };
  return createRouter({ routeTree, context, ...(history ? { history } : {}) });
}

export function createAppRuntime(history?: RouterHistory) {
  const runtime: Runtime = {};
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => redirectOnUnauthenticated(error, runtime),
    }),
    mutationCache: new MutationCache({
      onError: (error) => redirectOnUnauthenticated(error, runtime),
    }),
  });
  runtime.queryClient = queryClient;

  const router = createAppRouter(queryClient, history);
  runtime.router = router;
  return { queryClient, router };
}
