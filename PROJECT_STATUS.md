# VAYRO — Project Status

_Last updated: 2026-11-22_

## Current phase: Supabase connected → starting Phase 0 + 1

| Phase | Status | Tested |
|---|---|---|
| Planning: architecture, DB design, roadmap, services list | ✅ Done (`docs/`) | n/a |
| 0 Foundation & design system | ⏳ Next | — |
| 1 Database & Auth | ⏳ Ready to start (Supabase connected) | — |
| 2 Public website | Not started | — |
| 3 Merchant core | Not started | — |
| 4 Loyalty engine | Not started | — |
| 5 Team & permissions | Not started | — |
| 6 Engagement | Not started | — |
| 7 Apple / Google Wallet | Not started | — |
| 8 Subscriptions & billing | Not started | — |
| 9 Super Admin | Not started | — |
| 10 Analytics | Not started | — |
| 11 Hardening & launch | Not started | — |

## Credentials status
See `docs/SERVICES_AND_CREDENTIALS.md`. Configured: **Supabase** — URL + publishable key in `.env.local` (git-ignored); management access token stored as an encrypted environment network secret (never in code). Connection and SQL execution verified 2026-11-22.

## Open decisions
- Payment provider: depends on the country where the business is registered.
- Wallet model: platform-level Apple/Google credentials with optional merchant override (proposed default).

## Known issues
- Repository still contains the "green-bank" starter; it will be removed in Phase 0.
