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

-- 5. Transactional PostgreSQL RPC for atomic Month-End Rollovers
CREATE OR REPLACE FUNCTION public.close_month_rollover(
  p_target_month TEXT,
  p_new_savings NUMERIC,
  p_rollover_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_updated_bills INT := 0;
  v_rollover_uuid UUID;
BEGIN
  -- Get caller's authenticated user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Step 1: Mark all unpaid bills for target month as Paid
  UPDATE public.bills
  SET 
    status = 'Paid',
    paid_date = now()
  WHERE user_id = v_user_id
    AND month = p_target_month
    AND status != 'Paid';

  GET DIAGNOSTICS v_updated_bills = ROW_COUNT;

  -- Step 2: Update savings balance and reset monthly income to 0
  INSERT INTO public.settings (user_id, savings_account_balance, monthly_income)
  VALUES (v_user_id, p_new_savings, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    savings_account_balance = EXCLUDED.savings_account_balance,
    monthly_income = 0;

  -- Step 3: Insert or update rollover placeholder record in withdrawals
  v_rollover_uuid := COALESCE(p_rollover_id, gen_random_uuid());
  
  INSERT INTO public.withdrawals (id, user_id, month, amount, reason, date)
  VALUES (
    v_rollover_uuid,
    v_user_id,
    p_target_month,
    0,
    'ROLLOVER_' || p_target_month,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'target_month', p_target_month,
    'bills_closed', v_updated_bills,
    'new_savings', p_new_savings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_month_rollover(TEXT, NUMERIC, UUID) TO authenticated;
