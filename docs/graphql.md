# GraphQL

Schema-first. The SDL in `apps/api/src/graphql/schema.graphql` is the source of truth. Resolvers are a map per type, kept to 1–3 lines.

## Server

GraphQL Yoga 5 on Hono. Created in `app.ts` (round 3).

## Context

```ts
{
  (db, services, loaders, viewer, cookies);
}
```

Built per request. `viewer` is the authenticated user or `null`.

## Loaders

DataLoaders prevent N+1:

- `projectById`
- `taskCountsByProjectId` (single `GROUP BY` query)

## Errors

Stable codes in `extensions.code`:

- `UNAUTHENTICATED`
- `NOT_FOUND` (also for resources owned by another user)
- `BAD_USER_INPUT` (+ `fieldErrors` from Zod)
- `RATE_LIMITED`
- `INTERNAL_SERVER_ERROR` (everything else, masked)

## Pagination

Keyset cursor on `(created_at, id)`. Response shape: `{ items, nextCursor }`. `first` is 1–100.

## Production

- Introspection and GraphiQL are disabled when `NODE_ENV=production`.
- Trusted documents: the client preset generates `persisted-documents.json` (sha256 → operation). The API loads it at startup and Yoga's `usePersistedOperations` rejects unknown operations.
- Deploy the API before the web so the API already knows the new operations.

## TODO

- TODO(round 3): codegen setup, resolver implementation, context wiring, operation logging.
