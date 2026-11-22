# VAYRO — External services & credentials

No credential value is ever written to this file, to Git, or to frontend code.
This file only tracks **which** services are needed and their status.

| # | Service | Purpose | Cost | Needed for phase | Status |
|---|---|---|---|---|---|
| 1 | **Supabase** (supabase.com) | Database, Auth, Storage | Free tier to start; Pro $25/mo before launch (backups, no pausing) | 1 | ⏳ Requested |
| 2 | **Vercel** (vercel.com) | Hosting, cron, preview deploys | Free (Hobby) for dev; Pro $20/mo for commercial use | 11 (earlier for previews) | Not yet |
| 3 | **Resend** (resend.com) | Transactional email, invites, campaigns | Free 3k emails/mo | 5–6 | Not yet |
| 4 | **Domain name** (any registrar) | vayro.xxx website + email sender domain | ~$10–40/yr | 6 / 11 | Not yet |
| 5 | **Google Wallet API** (pay.google.com/business/console + Google Cloud) | Issuer ID, service account email, private key | Free; publishing to all users needs Google approval | 7 | Not yet |
| 6 | **Apple Developer Program** (developer.apple.com) | Team ID, Pass Type ID, signing certificate | $99/yr; enrolment verification can take days (organisations need a D-U-N-S number) | 7 | Not yet — **start early** |
| 7 | **Payment provider** (Stripe / Paddle / Lemon Squeezy / regional) | Subscription billing | % per transaction | 8 | Pending: which country is your business registered in? |
| 8 | Sentry (sentry.io) — optional | Error monitoring | Free tier | 11 | Optional |

## Values VAYRO generates itself (never asked from you)

`VAYRO_ENCRYPTION_KEY`, `QR_SIGNING_SECRET`, `CRON_SECRET`. These are random secrets we
generate and store as environment variables in Vercel.
