# VAYRO — Project Status

_Last updated: 2026-11-22_

## Current phase: Phases 0–1 done, 3–4 core done → next: remaining merchant modules (rewards/coupons/transactions pages, team & roles, locations, settings), then public website, billing, super admin, wallet

| Phase | Status | Tested |
|---|---|---|
| Planning: architecture, DB design, roadmap, services list | ✅ Done (`docs/`) | n/a |
| 0 Foundation & design system | ✅ Done | typecheck, lint, build, unit tests, visual check desktop/mobile |
| 1 Database & Auth | ✅ Done (invitation acceptance moves to Phase 5, workspace switcher to Phase 3) | 8 migrations applied; SQL security suite (isolation, escalation, ledger, billing) passes; E2E login → onboarding → dashboard passes on desktop + mobile; FR/AR(RTL)/EN checked |
| 2 Public website | Not started | — |
| 3 Merchant core | 🟡 Partial: dashboard shell + Overview, Programs (+ card designer, rewards, sign-up links), Customers + profiles done. Locations & Settings pages pending | E2E: programs flow; visual check desktop/mobile |
| 4 Loyalty engine | 🟡 Core done: ledger, stamps/points/visits, sign-up page, customer card page with signed rotating QR, staff scanner (camera + manual), rewards redemption, coupon redemption, anti-fraud. Pending: coupons management UI, transactions page, fraud review UI | SQL suite + E2E full loop (sign-up → scan → stamps → reward) + QR token unit tests |
| 5 Team & permissions | Not started | — |
| 6 Engagement | Not started | — |
| 7 Apple / Google Wallet | Not started | — |
| 8 Subscriptions & billing | Not started | — |
| 9 Super Admin | 🟡 Core done: platform KPIs (MRR/ARR, merchants by state, customers, cards, revenue), merchant directory + detail, cash payment recording (extends subscription, invoice + receipt), trial extension, suspension/reactivation, payments & open invoices, plan pricing editor, audit/system logs. Pending: MFA enforcement, platform wallet integrations page | E2E: non-admin blocked; admin records payment → subscription active |
| 10 Analytics | Not started | — |
| 11 Hardening & launch | Not started | — |

## Live site
- https://vayro-app.vercel.app (auto-deploys on every push to the development branch). E2E suite passes against production.

## Credentials status
See `docs/SERVICES_AND_CREDENTIALS.md`. Configured: **Supabase**, **Vercel** (token as environment network secret) — URL + publishable key in `.env.local` (git-ignored); management access token stored as an encrypted environment network secret (never in code). Connection and SQL execution verified 2026-11-22.

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
- **Secrets durability**: `VAYRO_ENCRYPTION_KEY`, `QR_SIGNING_SECRET`, `CRON_SECRET` are stored as encrypted Vercel env vars (source of truth). Never rotate the encryption key without re-encrypting stored integration secrets.
- Supabase advisor warns that SECURITY DEFINER functions are callable by signed-in users: intentional, each one performs its own permission check (covered by `supabase/tests`).
- Logo is an interim SVG mark; replace with the official VAYRO logo file when available.
