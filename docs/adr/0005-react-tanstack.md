# ADR 0005: React + TanStack over Astro

## Context

The frontend is an authenticated, fully interactive dashboard. There is no public content and no SEO requirement.

## Decision

React 19 with TanStack Router and TanStack Query. Tailwind 4 for styling.

## Options

- **Astro**: excellent for content sites, but the dashboard is 100% interactive behind auth. Astro's island model adds complexity without benefit.
- **Next.js**: heavier, and we do not need SSR or a server framework on the frontend.
- **Stay on React Router 6 + Apollo Client**: both are being replaced; Apollo Client adds a cache we do not need.

## Reason

TanStack Router gives type-safe, file-based routing with `beforeLoad` guards. TanStack Query handles server state, cache invalidation, and optimistic updates. The result is a thin client that talks to the GraphQL API with `fetch`.

## Consequences

- No SSR. The web app is a static build deployed to Cloudflare Pages.
- GraphQL operations are typed via the client preset (`TypedDocumentNode`).
- Code-splitting happens per route.

## Date

2026-10-08
