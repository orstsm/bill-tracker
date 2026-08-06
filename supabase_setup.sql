-- Supabase SQL Setup for Monthly Bill Tracker

-- 1. Create Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_income NUMERIC DEFAULT 0,
  savings_account_balance NUMERIC DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

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
