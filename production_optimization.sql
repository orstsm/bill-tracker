-- ==============================================================================
-- Production Optimization & Constraint Patch for Bill Tracker
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- 1. Deduplicate settings table (if any duplicate rows exist per user, keep the latest)
DELETE FROM public.settings a
USING public.settings b
WHERE a.user_id = b.user_id
  AND a.id < b.id;

-- 2. Add UNIQUE constraint on settings(user_id) to prevent race conditions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_settings_user_id'
  ) THEN
    ALTER TABLE public.settings ADD CONSTRAINT unique_settings_user_id UNIQUE (user_id);
  END IF;
END $$;

-- 3. Performance indexes for fast querying and filtering
CREATE INDEX IF NOT EXISTS idx_bills_user_month ON public.bills(user_id, month);
CREATE INDEX IF NOT EXISTS idx_bills_user_status ON public.bills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON public.recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_month ON public.withdrawals(user_id, month);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- 4. Financial integrity check constraints (ensure non-negative amounts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bills_amount') THEN
    ALTER TABLE public.bills ADD CONSTRAINT chk_bills_amount CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subs_amount') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT chk_subs_amount CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_withdrawals_amount') THEN
    ALTER TABLE public.withdrawals ADD CONSTRAINT chk_withdrawals_amount CHECK (amount >= 0);
  END IF;
END $$;
