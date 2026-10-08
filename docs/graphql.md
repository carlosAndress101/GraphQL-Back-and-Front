# GraphQL

Schema-first. The SDL in `apps/api/src/graphql/schema.graphql` is the source of truth; resolver TypeScript types are generated from it (`pnpm --filter @app/api codegen`, committed). Resolvers are a map per type, kept to 1–3 lines. Served by GraphQL Yoga 5 on Hono, composed in `app.ts`.

## Schema overview

- `scalar DateTime` (ISO-8601, mapped to `Date` on the resolver side).
- `User { id, email }`, `Project { id, name, description, createdAt, updatedAt, taskCounts, tasks }`, `Task { id, title, completed, project, createdAt, updatedAt }`, plus `TaskCounts`, `ProjectPage`, `TaskPage`.
- Inputs: `CredentialsInput`, `CreateProjectInput`, `UpdateProjectInput`, `CreateTaskInput`, `UpdateTaskInput`.
- `Query { me, projects(first, after, search), project(id) }`.
- `Mutation { signUp, signIn, signOut, createProject, updateProject, deleteProject, createTask, updateTask, setTaskCompleted, deleteTask }`.

## Context

Built per request: `{ viewer, services, cookies, clientIp, logger, requestId, loaders }`. `viewer` is the authenticated user (or `null`) resolved from the session cookie before execution.

## Loaders

N+1 is handled with per-request DataLoaders: `projectById` and `taskCountsByProjectId` (single `GROUP BY` query). The `queryCount` helper in tests asserts SQL statements per operation.

## Errors

Stable codes in `extensions.code`:

- `UNAUTHENTICATED` — no valid session.
- `NOT_FOUND` — also for resources owned by another user (existence is never revealed).
- `BAD_USER_INPUT` — plus `fieldErrors` from Zod, keyed by path, e.g.:

```json
{
  "errors": [
    {
      "message": "Invalid input",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "fieldErrors": { "email": ["Email is already registered"] }
      }
    }
  ]
}
```

- `RATE_LIMITED` — slow down; HTTP 429 carries a `Retry-After` header.
- `INTERNAL_SERVER_ERROR` — everything else, masked as `"Unexpected error"` in every environment.

## Pagination

Opaque cursors: base64url of `{ createdAt, id }`, validated with Zod (garbage → `BAD_USER_INPUT`). `first` is 1–100 (default 20); `nextCursor` is null when there are no more items — pass it as `after` for the next page.

## Auth flow

- Cookie: `__Host-session` in production (`HttpOnly; Secure; SameSite=Lax; Path=/`), plain `session` without `Secure` in development over `http://localhost`.
- `signUp`/`signIn` return a fresh session and set the cookie; `signIn` accepts the previous token and deletes it (rotation).
- Sessions live `SESSION_TTL_DAYS` (30 by default). `authenticate` extends expiry only when less than half the TTL remains, so steady traffic doesn't write on every request.
- Unknown emails cost one scrypt like wrong passwords, and both fail with identical `"Invalid email or password"` (no user enumeration).

## Limits

graphql-armor on every operation: max depth 8, max aliases 10, max directives 20, max tokens 2000, cost budget 1000 (defaults otherwise). Literal `first`/`last` integer arguments multiply their subtree's cost; variables do not — services still clamp `first` to 1–100. The budget is provisional and will be re-measured against real query patterns.

## Introspection and GraphiQL

Disabled in production (introspection plugin + `graphiql: false`); enabled in development and tests. Field suggestions (`Did you mean…?`) are masked in production.

## Trusted documents

In production only operations from `persisted-documents.json` execute: the API loads the manifest at startup (`PERSISTED_DOCUMENTS_PATH`, fails fast when missing) and rejects unknown hashes and raw queries. In development arbitrary queries are allowed. The manifest is generated in phase 4 — deploy the API before the web.

## CSRF

Simple (non-JSON) requests must carry the `x-graphql-yoga-csrf` header (any value); `application/json` POSTs are exempt. JSON clients just work:

```sh
curl http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  --data '{"query":"{ me { id email } }"}'
```

With a session:

```sh
curl http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -H "cookie: session=<token>" \
  --data '{"query":"{ me { id email } }"}'
```

Form-encoded clients add `-H 'x-graphql-yoga-csrf: 1'`.
