# VAYRO — Development Roadmap

Each phase ends with: tests run, bugs fixed, responsive check (mobile / tablet / desktop),
security check, DB + permission verification, and `PROJECT_STATUS.md` updated.
Nothing is marked complete until it is implemented **and** tested.

| # | Phase | Scope | Needs from you |
|---|---|---|---|
| 0 | **Foundation** | Remove green-bank starter, `src/` structure, strict TS, ESLint/Prettier, Vitest + Playwright, GitHub Actions CI, env validation, security headers, **VAYRO design system** (tokens, typography, components, motion, loading/empty/error states) | — |
| 1 | **Database & Auth** | All migrations (schema, indexes, RLS, DB functions, seed plans), Supabase Auth flows (register, login, reset, invites), merchant onboarding wizard, tenant switcher, RLS test suite | **Supabase** account + project |
| 2 | **Public website** | Home, Features, Pricing (reads `plans`), About, Contact (stored + emailed), Legal pages, SEO, OG images | Optional: domain |
| 3 | **Merchant core** | Shell/navigation, Overview, Loyalty Programs, **Card Designer** (live Apple/Google-style preview), Customers, Customer Profiles, Locations, Settings | — |
| 4 | **Loyalty engine** | Ledger + `apply_loyalty_transaction`, stamps/points/visits rules, enrolment links + QR, customer card page, **staff scanner PWA**, Rewards + redemption, Coupons, Transactions, anti-fraud layer | — |
| 5 | **Team & permissions** | Employees, invitations, Roles & Permissions editor, per-employee activity | Email provider (Resend) for invites |
| 6 | **Engagement** | Notifications centre, email templates, Campaigns (segments, schedule, send, stats) | Resend API key + verified domain |
| 7 | **Wallet** | Integrations page (Apple + Google forms), encrypted vault, Google class/object/JWT, Apple pkpass signing + web service + APNs, update queue, "Test connection" | Google Wallet issuer + service account; Apple Developer Program + Pass Type ID cert |
| 8 | **Subscriptions & billing** | Plans, trials, checkout, renewals, cancellations, expiry, invoices/payment history, plan limits, Billing page, provider adapter + webhooks | Payment provider account (depends on your country) |
| 9 | **Super Admin** | KPIs (merchants, customers, cards, MRR/ARR), merchants mgmt & suspension, plans, subscriptions, payments, platform analytics, system & audit logs, platform integrations | — |
| 10 | **Analytics** | Daily rollups, merchant analytics (enrolment, retention, redemption, cohorts, per-location/employee), exports (CSV) | — |
| 11 | **Hardening & launch** | Full security review, rate limits, a11y audit, performance, E2E suite, backups, Sentry, production deploy on Vercel, domain + email DNS, launch checklist | Vercel account, domain, Sentry (optional) |

Phases 0 and 1 begin immediately; phases 2–4 do not depend on any external credential beyond Supabase.
