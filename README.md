# Bill Tracker — iOS redesign

A production-oriented React PWA for tracking monthly bills, withdrawals, subscriptions, and cash flow. This version preserves the original calculations, adds an editable weekly forecast setting, and presents the tracker in an iOS-style app shell.

## What changed

- Four compact, interactive financial cards on Home
- Expandable unpaid-bills summary on Bills that automatically folds on navigation or outside taps
- Internal Home tabs for This Month, Upcoming, and Subscriptions
- Labeled Home, Bills, Activity, and Settings navigation
- Full-surface page swiping with force-based settling and a synchronized tab indicator
- Independent scroll position for each top-level page
- Native-style grouped lists, controls, confirmation sheets, and dark mode
- Safe-area support, reduced-motion support, accessible buttons, and scalable text
- Standalone PWA configuration with valid app icons
- Lazy-loaded cash-flow chart for a smaller initial bundle
- Searchable Philippine biller and popular subscription catalogs, plus manual entries with initials logos
- Specific due-soon notices that name affected billers and subscriptions
- Keyboard-aware sheets that stay usable when the iPhone keyboard is open
- Clean dependency security audit

## Financial behavior preserved

- Available cash remains `monthly income + savings − bills − withdrawals`
- Bills whose channel contains `CC` remain excluded from cash-outflow totals
- Paid, final, recurring, and upcoming-bill behavior is unchanged
- Projected cash deducts the editable weekly cash budget for every remaining Monday in the month (₱5,000 by default)
- Offline withdrawal and bill-update queues remain enabled
- Month-end rollover still closes unpaid bills, carries cash into savings, resets income, and records a rollover marker

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and anonymous key.
3. Run `npm install`.
4. Run `npm run dev` for development.
5. Run `npm run build` before deployment.

The database can be initialized with `supabase_setup.sql`. For an existing database, run `migrate_weekly_budget.sql` once in the Supabase SQL editor so the weekly budget syncs across devices. Until that migration is applied, the app safely keeps the edited weekly budget on the current device.

## Deployment & Security Configuration

The application is deployed on Vercel as a single-user private financial dashboard.

### Environment Variables

Configure these in your Vercel Project Settings (and local `.env.local`):

```text
# Client & Supabase public configuration
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-publishable-key>

# Single-user server configuration (Vercel Serverless & Cron)
OWNER_USER_ID=<your-supabase-user-uuid>
CRON_SECRET=<your-random-32-char-cron-secret>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Telegram notifications (optional - bot alerts for owner)
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
TELEGRAM_CHAT_ID=<your-telegram-chat-id>
```

### Security Checklist for Production

1. **Disable Public Signups**: In Supabase Dashboard ➔ **Authentication** ➔ **Providers** ➔ **Email**, turn off **"Enable Sign Up"** so no unauthorized accounts can be registered.
2. **Authenticated Endpoints**:
   - `/api/cron` requires `Authorization: Bearer <CRON_SECRET>` (sent automatically by Vercel Cron) and strictly queries records owned by `OWNER_USER_ID`.
   - `/api/telegram` requires a valid Supabase JWT bearer token belonging to `OWNER_USER_ID`. Unauthenticated requests are rejected.

## Checks

```bash
npm run lint
npm run build
npm audit
```
