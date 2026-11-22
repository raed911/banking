# VAYRO — Project Status

_Last updated: 2026-11-22_

## Current phase: Phase 0 + 1 complete → next: Phase 2 (public website) and Phase 3 (merchant dashboard)

| Phase | Status | Tested |
|---|---|---|
| Planning: architecture, DB design, roadmap, services list | ✅ Done (`docs/`) | n/a |
| 0 Foundation & design system | ✅ Done | typecheck, lint, build, unit tests, visual check desktop/mobile |
| 1 Database & Auth | ✅ Done (invitation acceptance moves to Phase 5, workspace switcher to Phase 3) | 8 migrations applied; SQL security suite (isolation, escalation, ledger, billing) passes; E2E login → onboarding → dashboard passes on desktop + mobile; FR/AR(RTL)/EN checked |
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
- ✅ Payments: Tunisia, TND, cash collected manually and recorded by the super admin. Plans: 99 TND/month, 499 TND/6 months, 999 TND/year (per point of sale). Brand references in `docs/brand/`.
- Interface language: French by default, Arabic (RTL) and English available (proposed, awaiting confirmation).
- Wallet model: platform-level Apple/Google credentials with optional merchant override (proposed default).

## How to run (developer notes)
- `npm run db:migrate` applies new SQL migrations, `npm run db:test` runs the database security suite, `npm run db:types` regenerates types.
- `npm run check` = typecheck + lint + unit tests; `npm run test:e2e` = browser tests (desktop + mobile).
- In this cloud sandbox Node needs `NODE_USE_ENV_PROXY=1` to reach Supabase (already set in the npm scripts).

## Known limitations / to do
- **Email delivery**: Supabase's built-in mailer only sends a few emails per hour. Real sign-ups need Resend (custom SMTP) + a domain before launch.
- **Super admin bootstrap**: the first platform admin is granted by SQL once the owner's account exists.
- **Secrets durability**: `VAYRO_ENCRYPTION_KEY` currently lives only in the sandbox `.env.local`. It must be copied to Vercel at deploy time (Phase 11) before any integration secret is stored.
- Supabase advisor warns that SECURITY DEFINER functions are callable by signed-in users: intentional, each one performs its own permission check (covered by `supabase/tests`).
- Logo is an interim SVG mark; replace with the official VAYRO logo file when available.
