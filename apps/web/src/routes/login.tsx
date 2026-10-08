import { useState } from "react";
import type { FormEvent } from "react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { meQueryOptions, useSignIn } from "../features/auth/hooks.ts";
import { GraphQLRequestError } from "../lib/graphql.ts";
import { validateAuthSearch } from "./-auth-search.ts";

export const Route = createFileRoute("/login")({
  validateSearch: validateAuthSearch,
  beforeLoad: async ({ context }) => {
    const result = await context.queryClient.fetchQuery(meQueryOptions());
    if (result.me) throw redirect({ to: "/projects" });
  },
  component: LoginPage,
});

function projectIdFromRedirect(redirectPath: string | undefined): string | undefined {
  if (!redirectPath?.startsWith("/") || redirectPath.startsWith("//")) return undefined;
  const pathname = redirectPath.split(/[?#]/, 1)[0];
  const match = /^\/projects\/([^/]+)\/?$/.exec(pathname ?? "");
  return match?.[1];
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const error = signIn.error;
  const emailError =
    error instanceof GraphQLRequestError ? error.fieldErrors?.email?.[0] : undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signIn.mutate(
      { input: { email: email.trim(), password } },
      {
        onSuccess: () => {
          const projectId = projectIdFromRedirect(search.redirect);
          if (projectId) {
            void navigate({ to: "/projects/$projectId", params: { projectId } });
          } else {
            void navigate({ to: "/projects" });
          }
        },
      },
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-text">
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-muted">Sign in to continue to your projects.</p>
      </header>
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="login-email">
            Email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
            id="login-email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
          {emailError ? <p className="mt-1 text-sm text-danger">{emailError}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="login-password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
            id="login-password"
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {error && !emailError ? (
          <p className="text-sm text-danger" role="alert">
            {error.message}
          </p>
        ) : null}
        <button
          className="min-h-11 rounded-md bg-accent px-4 py-2 font-medium text-surface hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          disabled={signIn.isPending}
          type="submit"
        >
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link className="text-accent underline" to="/signup">
          Create an account
        </Link>
      </p>
    </main>
  );
}
