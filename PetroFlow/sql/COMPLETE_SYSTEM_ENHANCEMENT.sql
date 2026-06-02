-- ============================================================================
-- PetroFlow Complete System Enhancement
-- Includes: Employee Salary Module, Enhanced Bank System, Fixes
-- Date: 2026-05-24
-- ============================================================================

-- ============================================================================
-- 1. EMPLOYEES TABLE (If not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id BIGSERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    father_name TEXT,
    phone VARCHAR(20),
    cnic VARCHAR(20) UNIQUE,
    address TEXT,
    designation VARCHAR(100),
    department VARCHAR(100),
    hire_date DATE NOT NULL,
    salary_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    bank_id BIGINT REFERENCES public.banks(id),
    account_number TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'resigned', 'terminated')),
    user_id UUID REFERENCES auth.users(id),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID DEFAULT public.get_my_company(),
    notes TEXT
);

COMMENT ON TABLE public.employees IS 'Employee master data for salary and attendance management';

-- ============================================================================
-- 2. EMPLOYEE SALARY PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_salary_payments (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    salary_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
    advance_deduction NUMERIC(14,2) DEFAULT 0,
    other_deductions NUMERIC(14,2) DEFAULT 0,
    bonuses NUMERIC(14,2) DEFAULT 0,
    net_salary NUMERIC(14,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque')),
    bank_id BIGINT REFERENCES public.banks(id),
    reference_no TEXT,
    notes TEXT,
    paid_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID DEFAULT public.get_my_company(),
    transaction_id BIGINT REFERENCES public.transactions(id)
);

COMMENT ON TABLE public.employee_salary_payments IS 'Monthly salary payment records';

CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON public.employee_salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_month ON public.employee_salary_payments(salary_month);

-- ============================================================================
-- 3. EMPLOYEE ADVANCES/LOANS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_advances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    advance_date DATE NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    repayment_status TEXT DEFAULT 'pending' CHECK (repayment_status IN ('pending', 'partial', 'paid')),
    total_repaid NUMERIC(14,2) DEFAULT 0,
    remaining_balance NUMERIC(14,2),
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer')),
    bank_id BIGINT REFERENCES public.banks(id),
    approved_by UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID DEFAULT public.get_my_company(),
    notes TEXT
);

COMMENT ON TABLE public.employee_advances IS 'Employee advance/loan tracking';

CREATE INDEX IF NOT EXISTS idx_emp_advances_employee ON public.employee_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_advances_status ON public.employee_advances(repayment_status);

-- ============================================================================
-- 4. ADVANCE REPAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_advance_repayments (
    id BIGSERIAL PRIMARY KEY,
    advance_id BIGINT NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
    repayment_date DATE NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    repayment_method TEXT CHECK (repayment_method IN ('salary_deduction', 'cash', 'bank_transfer')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID DEFAULT public.get_my_company()
);

CREATE INDEX IF NOT EXISTS idx_advance_repayments_advance ON public.employee_advance_repayments(advance_id);

-- ============================================================================
-- 5. BANK BALANCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bank_balances (
    id BIGSERIAL PRIMARY KEY,
    bank_id BIGINT NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
    balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    company_id UUID DEFAULT public.get_my_company(),
    UNIQUE(bank_id, company_id)
);

COMMENT ON TABLE public.bank_balances IS 'Current bank account balances';

-- ============================================================================
-- 6. BANK TRANSFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bank_transfers (
    id BIGSERIAL PRIMARY KEY,
    transfer_date DATE NOT NULL,
    from_bank_id BIGINT NOT NULL REFERENCES public.banks(id),
    to_bank_id BIGINT NOT NULL REFERENCES public.banks(id),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    reference_no TEXT,
    notes TEXT,
    transfer_type TEXT CHECK (transfer_type IN ('internal', 'external', 'online', 'cheque')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID DEFAULT public.get_my_company(),
    CHECK (from_bank_id != to_bank_id)
);

COMMENT ON TABLE public.bank_transfers IS 'Bank to bank fund transfers';

CREATE INDEX IF NOT EXISTS idx_bank_transfers_from ON public.bank_transfers(from_bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_to ON public.bank_transfers(to_bank_id);

-- ============================================================================
-- 7. BANK TRANSACTIONS (Enhanced tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id BIGSERIAL PRIMARY KEY,
    bank_id BIGINT NOT NULL REFERENCES public.banks(id),
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'deposit', 'withdrawal', 'transfer_in', 'transfer_out', 
        'salary_payment', 'company_payment', 'expense', 'other'
    )),
    amount NUMERIC(14,2) NOT NULL,
    reference_type TEXT, -- 'salary', 'transfer', 'expense', 'company', etc.
    reference_id BIGINT, -- ID of related record
    description TEXT,
    balance_before NUMERIC(14,2),
    balance_after NUMERIC(14,2),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID DEFAULT public.get_my_company()
);

COMMENT ON TABLE public.bank_transactions IS 'Detailed bank transaction log';

CREATE INDEX IF NOT EXISTS idx_bank_txn_bank ON public.bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_date ON public.bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_txn_type ON public.bank_transactions(transaction_type);

-- ============================================================================
-- 8. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add bank_id to transactions table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions' 
        AND column_name = 'bank_id'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN bank_id BIGINT REFERENCES public.banks(id);
    END IF;
END $$;

-- Add employee_id to transactions if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions' 
        AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN employee_id BIGINT REFERENCES public.employees(id);
    END IF;
END $$;

-- Add balance column to banks table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'banks' 
        AND column_name = 'balance'
    ) THEN
        ALTER TABLE public.banks ADD COLUMN balance NUMERIC(14,2) DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- 9. FUNCTIONS FOR BALANCE UPDATES
-- ============================================================================

-- Function to update bank balance
CREATE OR REPLACE FUNCTION update_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update bank balance on new transaction
        IF NEW.transaction_type IN ('deposit', 'transfer_in') THEN
            UPDATE public.banks 
            SET balance = COALESCE(balance, 0) + NEW.amount 
            WHERE id = NEW.bank_id;
        ELSIF NEW.transaction_type IN ('withdrawal', 'transfer_out', 'salary_payment', 'company_payment', 'expense') THEN
            UPDATE public.banks 
            SET balance = COALESCE(balance, 0) - NEW.amount 
            WHERE id = NEW.bank_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for bank balance update
DROP TRIGGER IF EXISTS trg_update_bank_balance ON public.bank_transactions;
CREATE TRIGGER trg_update_bank_balance
    AFTER INSERT ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_balance();

-- ============================================================================
-- 10. VIEWS FOR REPORTING
-- ============================================================================

-- Employee salary summary view
CREATE OR REPLACE VIEW v_employee_salary_summary AS
SELECT 
    e.id,
    e.employee_code,
    e.full_name,
    e.designation,
    e.salary_amount,
    e.status,
    COALESCE(SUM(esp.net_salary), 0) AS total_paid,
    COALESCE(SUM(ea.amount), 0) AS total_advances,
    COALESCE(SUM(ea.total_repaid), 0) AS advances_repaid,
    COALESCE(SUM(ea.amount) - SUM(ea.total_repaid), 0) AS advance_balance
FROM public.employees e
LEFT JOIN public.employee_salary_payments esp ON e.id = esp.employee_id
LEFT JOIN public.employee_advances ea ON e.id = ea.employee_id
GROUP BY e.id, e.employee_code, e.full_name, e.designation, e.salary_amount, e.status;

-- Bank balance summary view
CREATE OR REPLACE VIEW v_bank_balance_summary AS
SELECT 
    b.id,
    b.name,
    b.account_number,
    COALESCE(b.balance, 0) AS current_balance,
    COALESCE(SUM(CASE WHEN bt.transaction_type IN ('deposit', 'transfer_in') THEN bt.amount ELSE 0 END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN bt.transaction_type IN ('withdrawal', 'transfer_out', 'salary_payment', 'company_payment', 'expense') THEN bt.amount ELSE 0 END), 0) AS total_withdrawals
FROM public.banks b
LEFT JOIN public.bank_transactions bt ON b.id = bt.bank_id
GROUP BY b.id, b.name, b.account_number, b.balance;

-- Customer balance fix view
CREATE OR REPLACE VIEW v_customer_balance_fix AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.category,
    c.balance AS stored_balance,
    COALESCE(SUM(
        CASE 
            WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
            WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
            ELSE 0
        END
    ), 0) AS calculated_balance,
    c.balance - COALESCE(SUM(
        CASE 
            WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
            WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
            ELSE 0
        END
    ), 0) AS balance_difference
FROM public.customers c
LEFT JOIN public.transactions t ON c.id = t.customer_id
GROUP BY c.id, c.name, c.phone, c.category, c.balance
HAVING ABS(c.balance - COALESCE(SUM(
    CASE 
        WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
        WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
        ELSE 0
    END
), 0)) > 0.01; -- Show only mismatches

-- ============================================================================
-- 11. RLS POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advance_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for employees table
CREATE POLICY "Allow read for authenticated users" 
    ON public.employees FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow insert for admin and above" 
    ON public.employees FOR INSERT 
    WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Allow update for admin and above" 
    ON public.employees FOR UPDATE 
    USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Policies for salary payments
CREATE POLICY "Allow read for authenticated users" 
    ON public.employee_salary_payments FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow insert for admin and above" 
    ON public.employee_salary_payments FOR INSERT 
    WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

-- Policies for advances
CREATE POLICY "Allow read for authenticated users" 
    ON public.employee_advances FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow insert for admin and above" 
    ON public.employee_advances FOR INSERT 
    WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

-- Policies for bank tables (same pattern)
CREATE POLICY "Allow read for authenticated users" 
    ON public.bank_balances FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow read for authenticated users" 
    ON public.bank_transfers FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow insert for manager and above" 
    ON public.bank_transfers FOR INSERT 
    WITH CHECK (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Allow read for authenticated users" 
    ON public.bank_transactions FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow insert for all authenticated" 
    ON public.bank_transactions FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 12. INITIAL DATA SETUP
-- ============================================================================

-- Initialize bank balances for existing banks
INSERT INTO public.bank_balances (bank_id, balance, updated_by)
SELECT id, 0, NULL FROM public.banks
ON CONFLICT (bank_id, company_id) DO NOTHING;

-- ============================================================================
-- 13. HELPER FUNCTIONS
-- ============================================================================

-- Function to get employee advance balance
CREATE OR REPLACE FUNCTION get_employee_advance_balance(emp_id BIGINT)
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(amount - total_repaid), 0)
    FROM public.employee_advances
    WHERE employee_id = emp_id AND repayment_status != 'paid';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get bank balance
CREATE OR REPLACE FUNCTION get_bank_current_balance(bank_id_param BIGINT)
RETURNS NUMERIC AS $$
    SELECT COALESCE(balance, 0)
    FROM public.banks
    WHERE id = bank_id_param;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to fix customer balances
CREATE OR REPLACE FUNCTION fix_customer_balances()
RETURNS TABLE (
    customer_id INT,
    customer_name TEXT,
    old_balance NUMERIC,
    new_balance NUMERIC,
    difference NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    UPDATE public.customers c
    SET balance = calc.calculated_balance
    FROM (
        SELECT 
            c2.id,
            c2.name,
            c2.balance AS old_balance,
            COALESCE(SUM(
                CASE 
                    WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
                    WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
                    ELSE 0
                END
            ), 0) AS calculated_balance
        FROM public.customers c2
        LEFT JOIN public.transactions t ON c2.id = t.customer_id
        GROUP BY c2.id, c2.name, c2.balance
    ) calc
    WHERE c.id = calc.id 
    AND ABS(c.balance - calc.calculated_balance) > 0.01
    RETURNING c.id, c.name, calc.old_balance, calc.calculated_balance, (calc.calculated_balance - calc.old_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'PetroFlow Complete System Enhancement - Migration Completed Successfully!';
    RAISE NOTICE 'New Tables Created: employees, employee_salary_payments, employee_advances, employee_advance_repayments, bank_balances, bank_transfers, bank_transactions';
    RAISE NOTICE 'New Views Created: v_employee_salary_summary, v_bank_balance_summary, v_customer_balance_fix';
    RAISE NOTICE 'Helper Functions Created: get_employee_advance_balance, get_bank_current_balance, fix_customer_balances';
END $$;
