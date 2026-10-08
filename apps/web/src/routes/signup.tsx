import { useState } from "react";
import type { FormEvent } from "react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/Button.tsx";
import { TextField } from "../components/ui/TextField.tsx";
import { meQueryOptions, useSignUp } from "../features/auth/hooks.ts";
import { GraphQLRequestError } from "../lib/graphql.ts";
import { fieldErrorMessage } from "./-form-errors.ts";

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
  const error = signUp.error;
  const emailError = fieldErrorMessage(error, "email");
  const genericError =
    error && !emailError
      ? error instanceof GraphQLRequestError && error.code === "RATE_LIMITED"
        ? "Too many attempts. Please wait a moment and try again."
        : error.message
      : undefined;

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
        <TextField
          autoComplete="email"
          error={emailError}
          id="signup-email"
          label="Email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          autoComplete="new-password"
          hint="At least 8 characters."
          id="signup-password"
          label="Password"
          minLength={8}
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
        <Button disabled={signUp.isPending} loading={signUp.isPending} size="lg" type="submit">
          Create account
        </Button>
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
