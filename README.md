# Bill Tracker — iOS redesign

A production-oriented React PWA for tracking monthly bills, withdrawals, subscriptions, and cash flow. This version preserves the original calculations, adds an editable weekly forecast setting, and presents the tracker in an iOS-style app shell.

## What changed

- Four compact, interactive financial cards on Home
- Internal Home tabs for This Month, Upcoming, and Subscriptions
- Labeled Home, Bills, Activity, and Settings navigation
- Direct-manipulation page swiping with velocity, edge resistance, and snap-back
- Independent scroll position for each top-level page
- Native-style grouped lists, controls, confirmation sheets, and dark mode
- Safe-area support, reduced-motion support, accessible buttons, and scalable text
- Standalone PWA configuration with valid app icons
- Lazy-loaded cash-flow chart for a smaller initial bundle
- Searchable Philippine biller and popular subscription catalogs with local, optimized logos
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

## Deployment

The project is configured for Vercel. Add these environment variables in the deployment project:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

External Telegram notifications are intentionally disabled in this build so financial status is not transmitted outside Supabase without an explicit opt-in and authenticated integration. All in-app bill, cash-flow, withdrawal, subscription, and rollover features remain active.

## Checks

```bash
npm run lint
npm run build
npm audit
```
