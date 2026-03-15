-- ================================================================
-- EXISTING DATA MIGRATION SCRIPT
-- Yeh script existing (purana) data ko aapke Supabase user ID
-- ke sath attach karega.
--
-- STEPS:
-- 1. Supabase Dashboard mein jao → Authentication → Users
-- 2. Apna email dhundho aur User ID (UUID) copy karo
-- 3. Neeche 'YOUR-USER-UUID-HERE' ki jagah apna UUID paste karo
-- 4. Phir yeh SQL Supabase Dashboard → SQL Editor mein run karo
-- ================================================================

-- ⚠️  APNA USER UUID YAHAN PASTE KARO:
DO $$
DECLARE
  my_user_id UUID := 'YOUR-USER-UUID-HERE';
  -- Example: my_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
BEGIN

  -- ─── 1. CUSTOMERS ──────────────────────────────────────────
  UPDATE public.customers
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'customers updated: % rows', (SELECT COUNT(*) FROM public.customers WHERE user_id = my_user_id);

  -- ─── 2. TRANSACTIONS ───────────────────────────────────────
  UPDATE public.transactions
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'transactions updated: % rows', (SELECT COUNT(*) FROM public.transactions WHERE user_id = my_user_id);

  -- ─── 3. TANKS ──────────────────────────────────────────────
  UPDATE public.tanks
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'tanks updated: % rows', (SELECT COUNT(*) FROM public.tanks WHERE user_id = my_user_id);

  -- ─── 4. SETTINGS ───────────────────────────────────────────
  UPDATE public.settings
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'settings updated: % rows', (SELECT COUNT(*) FROM public.settings WHERE user_id = my_user_id);

  -- ─── 5. CASH_ADVANCES ──────────────────────────────────────
  UPDATE public.cash_advances
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'cash_advances updated: % rows', (SELECT COUNT(*) FROM public.cash_advances WHERE user_id = my_user_id);

  -- ─── 6. COMPANY_TRANSACTIONS ───────────────────────────────
  UPDATE public.company_transactions
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'company_transactions updated';

  -- ─── 7. STOCK_PURCHASES ────────────────────────────────────
  UPDATE public.stock_purchases
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'stock_purchases updated';

  -- ─── 8. COMPANY_REPAYMENTS ─────────────────────────────────
  UPDATE public.company_repayments
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'company_repayments updated';

  -- ─── 9. MOBIL_ARRIVALS ─────────────────────────────────────
  UPDATE public.mobil_arrivals
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'mobil_arrivals updated';

  -- ─── 10. MOBIL_SALES ───────────────────────────────────────
  UPDATE public.mobil_sales
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'mobil_sales updated';

  -- ─── 11. EXPENSE_CATEGORIES ────────────────────────────────
  UPDATE public.expense_categories
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'expense_categories updated';

  -- ─── 12. MEMBER_CARD_USAGE ─────────────────────────────────
  UPDATE public.member_card_usage
  SET user_id = my_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'member_card_usage updated';

  RAISE NOTICE '✅ Migration complete! Sab tables updated ho gaye.';

END $$;

-- ================================================================
-- VERIFY: Check karo kya data sahi attach hua
-- (Apna UUID neeche bhi paste karo)
-- ================================================================
/*
SELECT 'customers' as tbl, COUNT(*) FROM public.customers WHERE user_id = 'YOUR-USER-UUID-HERE'
UNION ALL
SELECT 'transactions', COUNT(*) FROM public.transactions WHERE user_id = 'YOUR-USER-UUID-HERE'
UNION ALL
SELECT 'tanks', COUNT(*) FROM public.tanks WHERE user_id = 'YOUR-USER-UUID-HERE'
UNION ALL
SELECT 'settings', COUNT(*) FROM public.settings WHERE user_id = 'YOUR-USER-UUID-HERE';
*/
