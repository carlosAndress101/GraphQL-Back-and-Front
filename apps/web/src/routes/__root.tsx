import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button.tsx";
import { EmptyState } from "../components/ui/EmptyState.tsx";
import { ToastProvider } from "../components/ui/Toast.tsx";

export type RouterContext = { queryClient: QueryClient };

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface text-text">
      <EmptyState
        title="Page not found"
        text="The page you requested does not exist."
        action={
          <Button onClick={() => void navigate({ to: "/projects" })} type="button">
            Return to projects
          </Button>
        }
      />
    </main>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  ),
  notFoundComponent: NotFoundPage,
  errorComponent: ({ reset }) => (
    <main className="flex min-h-screen items-center justify-center bg-surface text-text">
      <EmptyState
        title="This page could not be loaded"
        text="Check your connection and try again."
        action={
          <Button onClick={reset} type="button">
            Try again
          </Button>
        }
      />
    </main>
  ),
});
