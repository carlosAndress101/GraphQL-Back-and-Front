import { useState } from "react";
import type { FormEvent } from "react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button.tsx";
import { TextField } from "../components/ui/TextField.tsx";
import { meQueryOptions, useSignIn } from "../features/auth/hooks.ts";
import { GraphQLRequestError } from "../lib/graphql.ts";
import { validateAuthSearch } from "./-auth-search.ts";
import { fieldErrorMessage } from "./-form-errors.ts";

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
  const emailError = fieldErrorMessage(error, "email");
  const genericError =
    error && !emailError
      ? error instanceof GraphQLRequestError && error.code === "RATE_LIMITED"
        ? "Too many sign-in attempts. Please wait a moment and try again."
        : error instanceof GraphQLRequestError && error.code === "UNAUTHENTICATED"
          ? "Incorrect email or password."
          : error.message
      : undefined;

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
        <TextField
          autoComplete="email"
          error={emailError}
          id="login-email"
          label="Email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          autoComplete="current-password"
          id="login-password"
          label="Password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          type="password"
          value={password}
        />
        {genericError ? (
          <p className="text-sm text-danger" role="alert">
            {genericError}
          </p>
        ) : null}
        <Button disabled={signIn.isPending} loading={signIn.isPending} size="lg" type="submit">
          Sign in
        </Button>
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
