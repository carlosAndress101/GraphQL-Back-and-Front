# ADR 0008: Node 24 native type stripping

## Problem

The API needs TypeScript, but a build step adds tooling, slows iteration, and creates a dist/ folder to manage.

## Decision

Run `.ts` files directly with Node 24's native type stripping. `tsc --noEmit` only type-checks. No `tsx`, no build.

## Alternatives considered

- **tsx**: works, but adds a dependency and a loader.
- **Build to dist/**: traditional, but unnecessary with native stripping.
- **Deno**: different runtime; we want Node.

## Reason

Node 24 strips types natively. Relative imports use `.ts` extensions. The only constraint is erasable syntax (no enums, no parameter properties, no namespaces), enforced by `erasableSyntaxOnly`.

## Consequences

- `node --watch src/server.ts` for development.
- `node --import ./src/instrumentation.ts src/server.ts` for production.
- All relative imports must end in `.ts`.
- `import type` for type-only imports (`verbatimModuleSyntax`).
