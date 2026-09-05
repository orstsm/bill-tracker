-- Supabase SQL Setup for Monthly Bill Tracker

-- 1. Create Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_income NUMERIC DEFAULT 0,
  savings_account_balance NUMERIC DEFAULT 0,
  weekly_budget NUMERIC DEFAULT 5000,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_settings_user_id UNIQUE (user_id)
);

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS weekly_budget NUMERIC DEFAULT 5000;

-- 2. Create Recurring Bills table
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biller TEXT NOT NULL,
  statement_date TEXT,
  due_date TEXT,
  channel TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Create Bills table
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  biller TEXT NOT NULL,
  month TEXT NOT NULL,
  statement_date TEXT,
  due_date TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Unpaid',
  paid_date TIMESTAMP WITH TIME ZONE,
  channel TEXT,
  is_final BOOLEAN DEFAULT false,
  final_date TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Create Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  reason TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to read/write only their own data
CREATE POLICY "Users can manage their own settings" ON public.settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own recurring bills" ON public.recurring_bills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bills" ON public.bills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own withdrawals" ON public.withdrawals
  FOR ALL USING (auth.uid() = user_id);

-- 5. Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  renewal_date TIMESTAMP WITH TIME ZONE,
  cycle TEXT DEFAULT 'Monthly',
  status TEXT DEFAULT 'Active',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bills_user_month ON public.bills(user_id, month);
CREATE INDEX IF NOT EXISTS idx_bills_user_status ON public.bills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON public.recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_month ON public.withdrawals(user_id, month);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- 7. Transactional Month-End Rollover RPC
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.bills
  SET status = 'Paid', paid_date = now()
  WHERE user_id = v_user_id
    AND month = p_target_month
    AND status != 'Paid';

  GET DIAGNOSTICS v_updated_bills = ROW_COUNT;

  INSERT INTO public.settings (user_id, savings_account_balance, monthly_income)
  VALUES (v_user_id, p_new_savings, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    savings_account_balance = EXCLUDED.savings_account_balance,
    monthly_income = 0;

  v_rollover_uuid := COALESCE(p_rollover_id, gen_random_uuid());
  
  INSERT INTO public.withdrawals (id, user_id, month, amount, reason, date)
  VALUES (v_rollover_uuid, v_user_id, p_target_month, 0, 'ROLLOVER_' || p_target_month, now())
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

