# VAYRO — Project Status

_Last updated: 2026-11-22_

## Current phase: Planning complete → waiting on Supabase project (Phase 1 prerequisite)

| Phase | Status | Tested |
|---|---|---|
| Planning: architecture, DB design, roadmap, services list | ✅ Done (`docs/`) | n/a |
| 0 Foundation & design system | ⏳ Next | — |
| 1 Database & Auth | ⛔ Blocked: needs Supabase project | — |
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
See `docs/SERVICES_AND_CREDENTIALS.md`. Configured: **none yet**.

## Open decisions
- Payment provider: depends on the country where the business is registered.
- Wallet model: platform-level Apple/Google credentials with optional merchant override (proposed default).

## Known issues
- Repository still contains the "green-bank" starter; it will be removed in Phase 0.
