# Frontend

React 19 + TanStack Router (file-based) + TanStack Query 5 + Tailwind 4 + Vite. No GraphQL client library: typed documents are generated, and a tiny `fetch` wrapper executes them.

## Folders

- `src/routes/` — thin routes: loaders/guards + composition only.
- `src/features/{auth,projects,tasks}/` — operations, query hooks, container components.
- `src/components/ui/` — presentational only: props in, callbacks out. No fetching, no router, no Query imports.
- `src/components/layout/` — app shell (sidebar, topbar, page headers).
- `src/lib/` — `graphql.ts` (typed `request()`), `query-keys.ts`, small utils.
- `src/gql/` — generated typed documents + `persisted-documents.json` (committed; the API ships it).
- `src/styles.css` — Tailwind 4 `@theme` tokens. Components use semantic classes (`bg-sidebar text-muted`), never raw hex.
- `scripts/` — build tooling (`write-pages-files.ts` for Pages headers/redirects).

## Data flow

Route → feature hook → `request()` → API:

1. A route renders a feature container with route params.
2. The feature hook calls a TanStack Query `useQuery`/`useMutation` built on `request()` — a thin typed `fetch` (`credentials: "include"`, CSRF header `x-graphql-yoga-csrf`, base URL from `VITE_API_URL`).
3. Presentational components render the data; user actions call callbacks that run mutations.

## Server state

TanStack Query only — no global client store. Query keys live in `src/lib/query-keys.ts`; mutations invalidate precise keys. Task completion and inline edits update optimistically with rollback + error toast on failure.

## Auth guard

The authenticated layout route checks `me` in `beforeLoad`; null redirects to `/login?redirect=…`. Any `UNAUTHENTICATED` error clears the query cache and redirects to login.

## Design tokens and dark mode

Semantic tokens in `src/styles.css` (`surface`, `sidebar`, `hover`, `selected`, `border`, `text`, `muted`, `subtle`, `accent`, `accent-strong`, `danger`, `success`), light by default, dark via `prefers-color-scheme`. Notion-inspired: neutral surfaces, one blue accent, system font. Animations respect `prefers-reduced-motion` (`motion-safe:` variants only).

## Accessibility conventions

Real buttons/links/labels, visible focus rings, 44 px targets where touch matters, contrast ≥ 4.5:1. Toasts announce through an `aria-live="polite"` log; destructive actions confirm through a native `<dialog>`; tabs use roving tabindex with arrow-key navigation; inline edits save on Enter/blur and cancel on Esc; loading shows skeletons with screen-reader labels, never bare spinners alone.

## Testing approach

Vitest + Testing Library + user-event under jsdom, tests colocated with components. Query by role/label (that validates the a11y contract, not implementation details). Fake timers for auto-dismiss; `showModal` stubbed for `<dialog>` (jsdom lacks it). Test behavior and contracts — loading/busy states, keyboard flows, confirm/cancel, announce/dismiss — not pixel output or real screen readers.

## Known trade-offs

- **Operation text in the production bundle (deferred, 2026-10-08).** With `documentMode: "string"`, `src/gql/gql.ts` keeps every operation's source text (~5 kB raw, ~1–2 kB gzip) even though production only sends persisted hashes. Removing it needs the codegen SWC/Babel plugin, i.e. a new dev dependency and a change of the React Vite plugin. Declined for now: the saving is small and most of the eager `gql-*` chunk is React/TanStack Query runtime grouped by Vite's automatic chunking. Revisit together with a broader chunking review if initial-load size becomes a measured problem.
