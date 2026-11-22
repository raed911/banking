# VAYRO — System Architecture

> Status: **approved design, implementation not started.** This document describes the
> target architecture. `PROJECT_STATUS.md` tracks what is actually built and tested.

## 1. Product summary

VAYRO is a multi-tenant SaaS loyalty platform. Businesses (merchants) subscribe, design
digital loyalty cards (stamps, points, visits), enrol customers through links/QR codes,
issue those cards into **Apple Wallet** and **Google Wallet**, scan customers at the counter,
run rewards / coupons / campaigns, and analyse results. VAYRO staff operate the whole
platform from a separate Super Admin console.

## 2. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Web framework | **Next.js 15 (App Router) + React 19 + TypeScript (strict)** | One codebase for marketing site, dashboards, APIs and wallet web services; server components keep secrets server-side. |
| Styling / design system | **Tailwind CSS v4**, Radix UI primitives, custom VAYRO component library, `motion` (Framer Motion) | Full control over a premium, non-generic look; accessible primitives. |
| Charts | Recharts (custom-themed) | Composable, SSR-friendly. |
| Forms / validation | React Hook Form + **Zod** (shared client/server schemas) | Every server action re-validates input. |
| Database | **Supabase PostgreSQL** | Managed Postgres, RLS, backups, pg_cron. |
| Auth | **Supabase Auth** (email+password, magic link, Google OAuth later), MFA for admins | |
| Files | **Supabase Storage** (logos, strip images, pass assets) | Private buckets + signed URLs. |
| Background jobs | Postgres queue tables + `pg_cron` + Vercel Cron route handlers | Wallet push updates, campaign sends, subscription expiry. No extra infra. |
| Email | Resend (transactional + campaigns) | |
| Payments | **Manual / cash first** (`ManualProvider`): the super admin records a cash payment, which extends the subscription. Same `PaymentProvider` interface lets a Tunisian online gateway (Konnect, Flouci, Paymee) or Stripe be added later. | Market: Tunisia, currency TND. |
| Hosting | Vercel (app) + Supabase (data) | Zero-ops, global edge, preview deployments. |
| Monitoring | Sentry (errors) + `system_logs` table + Vercel logs | |
| Testing | Vitest (unit/integration), Playwright (E2E, responsive), SQL RLS tests | |
| CI | GitHub Actions: typecheck, lint, test, build | |

## 3. Application surfaces (one Next.js app, route groups)

```
app/
  (marketing)/            Public website: /, /features, /pricing, /about, /contact, /legal/*
  (auth)/                 /login, /register, /forgot-password, /reset-password, /invite/[token]
  (merchant)/dashboard/   Merchant dashboard (tenant-scoped, see §5)
  (admin)/admin/          VAYRO Super Admin (platform_admin role only, MFA enforced)
  (customer)/
    join/[slug]/          Customer enrolment page (public, rate-limited)
    c/[token]/            Customer card page: balance, QR, Add to Apple / Google Wallet
  (staff)/scan/           Installable PWA scanner for employees (camera QR, NFC-ready)
  api/
    wallet/apple/v1/...   Apple PassKit Web Service protocol (register, unregister, serials, pass, log)
    wallet/google/...     Google Wallet callbacks / save links
    billing/webhooks/[provider]
    cron/*                Signed cron endpoints (queues, expiry, campaign scheduler)
    v1/*                  Public REST API for merchants (API keys) — later phase
```

Middleware resolves the session, protects `/dashboard` and `/admin`, and sets security
headers (CSP, HSTS, frame-ancestors none, etc.).

## 4. Code organisation

```
src/
  app/                    routes (above)
  components/ui/          VAYRO design system primitives (Button, Input, Dialog, DataTable, Stat, Chart…)
  components/<domain>/    feature components
  features/<domain>/      domain logic: schemas (zod), server actions, queries, services
    loyalty/ customers/ rewards/ coupons/ campaigns/ analytics/ employees/ billing/ wallet/ admin/
  lib/
    supabase/             server client (user-scoped, RLS), admin client (service role, server-only)
    crypto/               AES-256-GCM secret vault, HMAC QR tokens
    wallet/apple/         .pkpass builder, PKCS#7 signer, APNs client
    wallet/google/        class/object REST client, JWT "save" link signer
    payments/             PaymentProvider interface + adapters
    permissions/          permission catalogue + `can()` helpers
    rate-limit/           Postgres-backed sliding window limiter
supabase/
  migrations/             versioned SQL migrations (schema, RLS, functions, seed)
  tests/                  RLS / function tests
tests/                    vitest + playwright
```

Rule: **anything using the service-role key or a decrypted secret lives in files marked
`import "server-only"`** so it cannot be bundled to the browser.

## 5. Multi-tenancy & security model

* **Shared schema, row-level isolation.** Every tenant-owned table has `merchant_id uuid not null`
  with an index, and RLS enabled with policies of the form
  `using (public.has_merchant_permission(merchant_id, '<perm>'))`.
* `merchant_members(user_id, merchant_id, role_id, status)` links users to tenants. A user can
  belong to several merchants (agency/owner of multiple brands); the active merchant is chosen
  in the UI and validated server-side on every request.
* Helper functions (`security definer`, fixed `search_path`):
  `is_platform_admin()`, `is_merchant_member(mid)`, `has_merchant_permission(mid, perm)`.
* **Roles & permissions:** system roles (Owner, Admin, Manager, Cashier) + custom roles per
  merchant. Permissions are a fixed catalogue (e.g. `customers.read`, `cards.stamp`,
  `rewards.redeem`, `billing.manage`). Enforced in three places: UI (hide), server action (check),
  database (RLS) — the DB is the final authority.
* **Super admin:** `platform_admins` table, separate route group, MFA required, every action
  written to `audit_logs`. Super admin never uses the service key from the browser.
* **Customers are not Supabase Auth users** by default (lower friction). They are reached by
  an unguessable card token (`/c/[token]`); optional OTP login later.
* **Secrets vault:** integration secrets (Apple cert/key/password, Google private key, payment
  keys) are encrypted with AES-256-GCM using `VAYRO_ENCRYPTION_KEY` (env var, never in DB/Git)
  and stored as ciphertext. The API only ever returns "configured / last 4 chars / updated at".
* **Plan entitlements** (max programs, customers, employees, locations, wallet passes, campaigns)
  are checked in server actions and in DB functions for critical paths.

## 6. Loyalty engine

* **Program types:** `stamps` (N stamps → reward), `points` (spend/earn rules, tiers optional),
  `visits` (visit-count milestones). A merchant can run multiple programs.
* **Ledger-based balances.** `loyalty_transactions` is append-only (earn / redeem / adjust /
  expire / reverse). `loyalty_cards.balance` is updated only inside the DB function
  `apply_loyalty_transaction()` which locks the card row (`FOR UPDATE`), validates rules,
  writes the ledger row and the new balance atomically. Corrections are reversing entries,
  never updates/deletes.
* **Idempotency:** every scan/earn/redeem carries an `idempotency_key` (unique per merchant),
  so double taps and network retries cannot double-stamp.
* **QR codes:** the customer card shows a rotating QR = HMAC-signed token
  `(card_id, nonce, expires_at)` valid for ~60s; wallet passes carry a static card identifier
  that requires an authenticated staff scanner to act on. NFC: pass/card model already carries
  NFC payload fields (Apple VAS / Google Smart Tap need separate approvals from Apple/Google).
* **Anti-fraud:** per-card cooldown between stamps, daily per-card & per-employee caps,
  per-location velocity limits, single-use redemption codes with expiry, signed + expiring QR
  tokens, staff-only scanning with per-employee attribution, rate-limited enrolment (per IP /
  phone / email), duplicate-customer detection, `fraud_signals` table + admin review queue,
  full audit log.

## 7. Wallet integrations (real, credential-driven)

Design: VAYRO operates **one platform-level Apple Pass Type ID and one Google Wallet Issuer**
(configured by the super admin) and issues branded passes for every merchant. The merchant
**Integrations page** additionally lets a merchant bring their **own** credentials; if present,
they override the platform ones. Both forms contain exactly the fields requested:

* **Google Wallet** — Issuer ID, Service Account Email, Private Key.
  Flow: create/update `LoyaltyClass` per program (REST, OAuth2 service-account token) →
  create `LoyaltyObject` per card → sign "Save to Google Wallet" JWT (RS256) → on balance
  change `PATCH` the object (Google pushes it to the device).
* **Apple Wallet** — Team ID, Pass Type Identifier, Certificate (.p12/.pem), Private Key,
  Certificate Password (+ Apple WWDR intermediate, bundled).
  Flow: build `pass.json` + images + `manifest.json` (SHA-1 of each file) → PKCS#7 detached
  signature → zip to `.pkpass`. Implements Apple's PassKit **web service** endpoints for device
  registration; on balance change, enqueue → send an empty APNs push (HTTP/2, token from the
  pass certificate) → device fetches the updated pass.
* A **"Test connection"** button validates credentials for real (Google: obtain token + read
  issuer; Apple: parse/validate cert, check expiry, sign a test pass). Status is shown honestly:
  *Not configured → Configured (unverified) → Verified → Error*.

## 8. Subscriptions & billing

**Business decisions (2026-11-22):** market Tunisia, currency **TND**, payment collected **in cash**.
Single **Pro** plan priced per point of sale (location):

| Billing period | Price | Note |
|---|---|---|
| Monthly | 99 TND / month | "Simple" |
| 6 months | 499 TND | "1 mois offert" (≈ 5 months price) |
| Annual | 999 TND / year | "2 mois offerts" (≈ 10 months price) |

Cash flow: merchant registers → free trial → merchant picks a period in Billing and gets a
payment reference → VAYRO collects cash → super admin clicks **Record payment** (amount,
period, receipt no.) → subscription period is extended, invoice/receipt generated, merchant
notified. Expiry reminders before the period ends; grace period then restriction (read-only)
then suspension — all configurable.

* `plans` + `plan_prices` (monthly / annual, currency), `limits jsonb`, `features jsonb`.
* `subscriptions` state machine: `trialing → active → past_due → canceled / expired`, plus
  `cancel_at_period_end`. Free trial length configurable per plan.
* `invoices`, `payments`, `payment_provider_events` (webhook log, unique event id = idempotent).
* `PaymentProvider` interface: `createCheckout`, `createPortalSession`, `cancel`, `resume`,
  `parseWebhook`. The first adapter is chosen once we know your country.
* Daily `pg_cron` job: expire trials, mark past-due, enforce suspension, send reminders.
* Super admin can comp, extend trials, change plans, suspend/reactivate merchants.

## 9. Database (high-level ERD)

```
auth.users ─┬─ profiles
            ├─ platform_admins
            └─ merchant_members ── roles ── role_permissions
merchants ─┬─ locations
           ├─ invitations
           ├─ subscriptions ── invoices ── payments
           ├─ loyalty_programs ─┬─ card_designs
           │                    ├─ rewards
           │                    └─ enrollment_links
           ├─ customers ── loyalty_cards ─┬─ loyalty_transactions (append-only ledger)
           │                              ├─ reward_redemptions
           │                              └─ wallet_passes ── apple_device_registrations
           ├─ coupons ── coupon_redemptions
           ├─ campaigns ── campaign_deliveries
           ├─ notifications
           ├─ merchant_integrations (encrypted secrets)
           ├─ api_keys (hashed)
           └─ fraud_signals
platform: plans, plan_prices, platform_settings, platform_integrations,
          audit_logs, system_logs, job_queue, rate_limits, payment_provider_events
```

Scale notes: UUID v7-style ids (time-ordered), composite indexes leading with `merchant_id`,
`loyalty_transactions` designed for monthly partitioning when volume requires it, analytics via
materialised daily rollups (`merchant_daily_stats`) refreshed by cron instead of heavy live queries.

## 10. Environments & secrets

| Variable | Where | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel + `.env.local` | Yes (safe by design; RLS protects data) |
| `SUPABASE_SECRET_KEY` | Vercel + `.env.local` | **Never** |
| `VAYRO_ENCRYPTION_KEY`, `QR_SIGNING_SECRET`, `CRON_SECRET` | Generated by us, stored in Vercel | **Never** |
| `RESEND_API_KEY`, payment keys, `SENTRY_DSN` | Vercel | Never (DSN is public-safe) |
| Wallet certificates / keys | Encrypted in DB via Integrations page | **Never** |

`.env*` is git-ignored; `.env.example` documents names only.
