# ADR 0006: Same-site deployment topology

## Problem

The session cookie must be sent with credentialed requests. Cross-site cookies require `SameSite=None; Secure` and are increasingly blocked.

## Decision

Deploy the API at `api.<domain>` (Dokploy + Cloudflare Tunnel) and the web at `app.<domain>` (Cloudflare Pages). Both are subdomains of the same registrable domain, so the cookie is first-party.

## Alternatives considered

- **Separate domains**: would require `SameSite=None`, which browsers restrict.
- **Same origin (path-based)**: possible, but splits routing between Pages and the tunnel is harder to operate.
- **API on a subdomain, web on the apex**: still same-site if the registrable domain matches.

## Reason

`SameSite=Lax` works for first-party subdomains. The cookie is sent on top-level navigations and same-site `fetch` with `credentials: 'include'`. No third-party cookie warnings.

## Consequences

- CORS allowlist is `https://app.<domain>` in production.
- `TRUST_PROXY=cloudflare` so the API sees the real client IP from `CF-Connecting-IP`.
- Deploy the API before the web (trusted documents).
