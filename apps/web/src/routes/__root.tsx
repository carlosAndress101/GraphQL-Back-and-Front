import type { QueryClient } from "@tanstack/react-query";
import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

export type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl p-8 text-text">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">The page you requested does not exist.</p>
      <Link className="mt-6 inline-block text-accent underline" to="/projects">
        Return to projects
      </Link>
    </main>
  ),
  errorComponent: ({ reset }) => (
    <main className="mx-auto max-w-2xl p-8 text-text">
      <h1 className="text-2xl font-semibold">This page could not be loaded</h1>
      <p className="mt-2 text-muted">Check your connection and try again.</p>
      <button
        className="mt-6 rounded-md bg-accent px-4 py-2 text-surface hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </main>
  ),
});
