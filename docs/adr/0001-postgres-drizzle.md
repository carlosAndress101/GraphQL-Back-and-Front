# ADR 0001: PostgreSQL + Drizzle

## Problem

The original stack used MongoDB with Mongoose 6 (unsupported). The domain is relational: users own projects, projects own tasks, and deletes must cascade. Mongoose had no foreign keys, no indexes on `projectId`, and a typo (`createAt`) that left timestamps null.

## Decision

PostgreSQL with Drizzle ORM. Schema is defined in TypeScript; migrations are versioned SQL.

## Alternatives considered

- **Stay on MongoDB**: no referential integrity, no cascades, continued Mongoose risk.
- **Prisma**: heavier runtime, less control over SQL, migration story is more opaque.
- **Kysely**: good query builder, but no schema-as-code story we wanted.

## Reason

The domain is relational. Foreign keys with `ON DELETE CASCADE` eliminate orphaned tasks by design. Drizzle derives TypeScript types from the schema, so the database and the code cannot drift.

## Consequences

- Repositories are the only modules that import Drizzle.
- Changing the database engine means rewriting repositories, not services.
- Migrations are committed SQL; `drizzle-kit push` is forbidden.
