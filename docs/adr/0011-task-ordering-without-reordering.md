# ADR 0011: Task ordering without manual reordering

## Context

The approved frontend direction is a Notion-inspired workspace, where tasks usually show a drag handle for manual reordering. Tasks are currently ordered by `(created_at, id)`, which is also the keyset used for cursor pagination. Manual reordering would change the database, the GraphQL contract and the pagination model.

## Options

- **A. No reordering for now**: keep `(created_at, id)` ordering and pagination; remove the drag handle from the design.
- **B. Drag-and-drop reordering**: `position` column + migration, `moveTask(id, afterId)` mutation, position-based pagination, a drag-and-drop dependency in the web app.

## Decision

A — no reordering (decided by the project owner).

## Reason

The backend is stable and tested; reordering is not a current product requirement (YAGNI). Option B adds a migration, a new mutation, a different pagination model, frontend complexity and a dependency. The UI shows no drag handle, so there is no non-functional affordance.

## Consequences

- Tasks appear in creation order; pagination stays keyset on `(created_at, id)`.
- If reordering becomes a real requirement, treat it as a new architectural change and evaluate the ordering model (fractional/lexorank positions), pagination, concurrent moves and the GraphQL contract at that time.

## Date

2026-10-08
