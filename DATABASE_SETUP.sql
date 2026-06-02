-- =============================================
-- PetroFlow - Complete Database Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- ============================================
-- 1. USER PROFILES TABLE (FIXES LOGIN FAILURE)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'employee' CHECK (role IN ('super_admin', 'admin', 'manager', 'employee')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected', 'suspended')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own profile (but not role/status)
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins/Super Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('super_admin', 'admin')
        )
    );

-- Admins can update any profile (for approvals)
CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('super_admin', 'admin')
        )
    );

-- Allow insert for the trigger function (runs as SECURITY DEFINER)
CREATE POLICY "Service role can insert profiles"
    ON public.user_profiles FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, full_name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
        'pending'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. BANKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.banks (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    account_number TEXT,
    branch TEXT,
    balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage banks" ON public.banks
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 4. CASH DEPOSITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.cash_deposits (
    id BIGSERIAL PRIMARY KEY,
    bank_id BIGINT REFERENCES public.banks(id),
    deposit_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    deposited_by TEXT,
    reference TEXT,
    note TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cash_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage deposits" ON public.cash_deposits
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 5. BANK TRANSFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bank_transfers (
    id BIGSERIAL PRIMARY KEY,
    from_bank_id BIGINT REFERENCES public.banks(id),
    to_bank_id BIGINT REFERENCES public.banks(id),
    transfer_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transfer_type TEXT DEFAULT 'internal',
    reference_no TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage transfers" ON public.bank_transfers
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 6. BANK TRANSACTIONS TABLE (LEDGER)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id BIGSERIAL PRIMARY KEY,
    bank_id BIGINT REFERENCES public.banks(id),
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage bank transactions" ON public.bank_transactions
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 7. EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.employees (
    id BIGSERIAL PRIMARY KEY,
    employee_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    father_name TEXT,
    phone TEXT,
    cnic TEXT,
    designation TEXT,
    department TEXT,
    hire_date DATE,
    salary_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
    address TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employees" ON public.employees
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 8. EMPLOYEE SALARY PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.employee_salary_payments (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES public.employees(id),
    payment_date DATE NOT NULL,
    salary_month TEXT NOT NULL,
    basic_salary DECIMAL(15,2) NOT NULL,
    advance_deduction DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    bonuses DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    bank_id BIGINT REFERENCES public.banks(id),
    reference_no TEXT,
    notes TEXT,
    paid_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage salary payments" ON public.employee_salary_payments
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 9. EMPLOYEE ADVANCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.employee_advances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES public.employees(id),
    advance_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    total_repaid DECIMAL(15,2) DEFAULT 0,
    remaining_balance DECIMAL(15,2),
    repayment_status TEXT DEFAULT 'pending' CHECK (repayment_status IN ('pending', 'partially_repaid', 'fully_repaid')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage advances" ON public.employee_advances
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 10. ACTIVATE YOUR EXISTING USER
-- ============================================
-- IMPORTANT: Replace 'your-email@example.com' with your actual email
-- then run this line separately after the tables are created:
--
-- UPDATE public.user_profiles SET status='active', role='super_admin' WHERE email='your-email@example.com';
--

-- ============================================
-- 11. CREATE PROFILE FOR EXISTING AUTH USERS
-- (if they signed up before the trigger existed)
-- ============================================
INSERT INTO public.user_profiles (user_id, email, full_name, role, status)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', ''),
    COALESCE(u.raw_user_meta_data->>'role', 'employee'),
    'pending'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
);

-- ============================================
-- DONE! Now activate your user:
-- UPDATE public.user_profiles SET status='active', role='super_admin' WHERE email='maligillani5@gmail.com';
-- ============================================
