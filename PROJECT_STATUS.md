# VAYRO — Project Status

_Last updated: 2026-11-23_

## Current phase: Phases 0–1 done, 3–4 core done → next: remaining merchant modules (rewards/coupons/transactions pages, team & roles, locations, settings), then public website, billing, super admin, wallet

| Phase | Status | Tested |
|---|---|---|
| Planning: architecture, DB design, roadmap, services list | ✅ Done (`docs/`) | n/a |
| 0 Foundation & design system | ✅ Done | typecheck, lint, build, unit tests, visual check desktop/mobile |
| 1 Database & Auth | ✅ Done (invitation acceptance moves to Phase 5, workspace switcher to Phase 3) | 8 migrations applied; SQL security suite (isolation, escalation, ledger, billing) passes; E2E login → onboarding → dashboard passes on desktop + mobile; FR/AR(RTL)/EN checked |
| 2 Public website | ✅ Home (hero, how it works, features, brand pricing cards from DB, security, FAQ, CTA), Features, Pricing, About, Contact (stored, rate-limited, admin inbox), Terms & Privacy (templates to be reviewed by a lawyer), sitemap, robots, SEO metadata — FR/AR/EN | E2E: pages, pricing from DB, contact form; visual check desktop/mobile/RTL |
| 3 Merchant core | ✅ Overview, Programs (+ card designer, rewards, sign-up links), Customers + profiles, Rewards, Locations (plan-limited), Settings (profile, logo, brand color) | E2E: programs flow + merchant pages smoke test |
| 4 Loyalty engine | 🟡 Core done: ledger, stamps/points/visits, sign-up page, customer card page with signed rotating QR, staff scanner (camera + manual), rewards redemption, coupon redemption, anti-fraud. Coupons management (apply from the scanner, from the customer profile, or without a card; per-customer coupon history), Transactions ledger and fraud-alert review now done | SQL suite + E2E full loop (sign-up → scan → stamps → reward) + QR token unit tests |
| 5 Team & permissions | ✅ Invitations by secure link (hashed token, 7 days, email-bound — no email provider needed), acceptance flow, member role change/disable/remove, roles & permissions editor (system + custom roles, no wildcard escalation) | E2E: invite → accept → cashier restricted |
| 6 Engagement | 🟡 Automations ✅ (daily win-back for absent customers with per-customer cooldown, birthday message; consent-aware; via pg_cron). Campaigns (channels: in-card announcement ✅ live, Google Wallet notification ✅ live, email ⏳ domain): server-side segments (all, inactive, active, new, birthday month, tag, program), consent-aware audience counts, email/Wallet channels, scheduling materializes recipients and queues `campaign.send`. Notifications page done. ⏳ Actual delivery waits for Resend (email, needs domain) / Wallet credentials | E2E: audience + scheduling |
| 7 Apple / Google Wallet | 🟢 **Google Wallet LIVE**: credentials verified (issuer 3388000000023245135, demo mode until Google approves publishing), passes issued from the customer card page (Android), instant updates after each operation + background worker (pg_cron→pg_net→/api/cron/jobs, Vault-stored secret), merchant locations & campaign messages. ⏳ Google publishing approval (business profile + request in Wallet console). 🟢 **Apple Wallet LIVE** (Apple Developer account active 2026-11-24, Team ATP9UG29MN, Pass Type ID `pass.app.vayro.loyalty`, certificate valid until 2027-12-24 — renew before expiry): signed .pkpass (store card, stamp-grid strip image, logo/icon, QR `VYS.<serial>`, location relevance, campaign "news" field with lock-screen notification), "Add to Apple Wallet" on iPhone/Mac Safari, full PassKit web service (register/unregister, updates list, latest pass with 304, device logs), APNs pushes after every operation / design change / Wallet campaign, certificate assistant in Intégrations (VAYRO generates the key + CSR, imports the .cer from Apple, fills Team ID / Pass Type ID, "Test connection" signs a real test manifest with the Apple WWDR G4 chain) | Unit: pass.json, stamp strip, zip + SHA-1 manifest, PKCS#7 signature verified with OpenSSL, CSR→.cer. E2E: assistant → download → device registration → stamp → update list → new pass → 304 → unregister. ✅ Real iPhone test 2026-11-24: pass added from Safari, device registered with the web service, staff stamp → APNs push → pass updated with lock-screen notification within seconds |
| 8 Subscriptions & billing | 🟡 Cash flow done: plans/prices, trials, merchant Billing page (choose period + locations → invoice with payment instructions), admin payment recording, renewals, daily expiry job, plan limits (locations). Online gateway not connected (not needed for cash) | E2E: invoice request; admin payment; SQL suite |
| 9 Super Admin | 🟡 Core done: platform KPIs (MRR/ARR, merchants by state, customers, cards, revenue), merchant directory + detail, cash payment recording (extends subscription, invoice + receipt), trial extension, suspension/reactivation, payments & open invoices, plan pricing editor, audit/system logs. MFA (TOTP) enforced at the database level (is_platform_admin requires AAL2) and in the UI; every admin page guarded individually. Pending: platform wallet integrations page | E2E: non-admin blocked; admin records payment → subscription active |
| 10 Analytics | 🟡 Merchant analytics: per-program table, peak hours, top customers, by location, by employee, consent rate, CSV export (formula-injection safe). Daily rollups for scale pending | E2E smoke + export test |
| 11 Hardening & launch | Not started | — |

## Live site
- https://vayro-app.vercel.app (auto-deploys on every push to the development branch). E2E suite passes against production.

## Location marketing (geofencing)
✅ Built: merchant "Proximité" section (interactive map, coordinates, radius, enable/disable, message, phone previews),
time-boxed location campaigns with first-party analytics, admin usage view, Apple `locations`/`maxDistance` and
Google `merchantLocations` builders (unit-tested), automatic pass-refresh jobs, scheduler (pg_cron).
⏳ Goes live on phones when Apple/Google Wallet credentials are configured (Phase 7). Tested: SQL suite 002 + E2E.

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
- **Super admin bootstrap**: the first platform admin is granted by SQL once the owner's account exists. The admin must enable 2-step verification (Mon compte) before using the admin area.
- **Secrets durability**: `VAYRO_ENCRYPTION_KEY`, `QR_SIGNING_SECRET`, `CRON_SECRET` are stored as encrypted Vercel env vars (source of truth). Never rotate the encryption key without re-encrypting stored integration secrets.
- Supabase advisor warns that SECURITY DEFINER functions are callable by signed-in users: intentional, each one performs its own permission check (covered by `supabase/tests`).
- ✅ Official VAYRO logo in place (vector mark, favicon, Apple touch icon; source in docs/brand/).
