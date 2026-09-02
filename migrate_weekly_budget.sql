-- Run once in the Supabase SQL editor for existing Bill Tracker databases.
-- Existing users keep the original ₱5,000 weekly forecast until they edit it.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS weekly_budget NUMERIC DEFAULT 5000;
