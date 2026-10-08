import { useState } from "react";
import type { FormEvent } from "react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { meQueryOptions, useSignUp } from "../features/auth/hooks.ts";
import { GraphQLRequestError } from "../lib/graphql.ts";

export const Route = createFileRoute("/signup")({
  beforeLoad: async ({ context }) => {
    const result = await context.queryClient.fetchQuery(meQueryOptions());
    if (result.me) throw redirect({ to: "/projects" });
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const signUp = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailError =
    signUp.error instanceof GraphQLRequestError ? signUp.error.fieldErrors?.email?.[0] : undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signUp.mutate(
      { input: { email: email.trim(), password } },
      { onSuccess: () => void navigate({ to: "/projects" }) },
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-text">
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
        <p className="mt-2 text-muted">A clear space to keep your projects moving.</p>
      </header>
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="signup-email">
            Email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
            id="signup-email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
          {emailError ? <p className="mt-1 text-sm text-danger">{emailError}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="signup-password">
            Password
          </label>
          <input
            autoComplete="new-password"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
            id="signup-password"
            minLength={8}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {signUp.error && !emailError ? (
          <p className="text-sm text-danger" role="alert">
            {signUp.error.message}
          </p>
        ) : null}
        <button
          className="min-h-11 rounded-md bg-accent px-4 py-2 font-medium text-surface hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          disabled={signUp.isPending}
          type="submit"
        >
          {signUp.isPending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already registered?{" "}
        <Link className="text-accent underline" to="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
