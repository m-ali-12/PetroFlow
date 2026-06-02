-- ============================================================================
-- CUSTOMER BALANCE FIX SCRIPT
-- Fixes customer balance display issues
-- ============================================================================

-- Step 1: View current customer balance mismatches
SELECT 
    c.id,
    c.name,
    c.phone,
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
    ), 0) AS difference
FROM public.customers c
LEFT JOIN public.transactions t ON c.id = t.customer_id
GROUP BY c.id, c.name, c.phone, c.balance
HAVING ABS(c.balance - COALESCE(SUM(
    CASE 
        WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
        WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
        ELSE 0
    END
), 0)) > 0.01
ORDER BY ABS(c.balance - COALESCE(SUM(
    CASE 
        WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
        WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
        ELSE 0
    END
), 0)) DESC;

-- Step 2: Fix all customer balances
UPDATE public.customers c
SET balance = calc.calculated_balance
FROM (
    SELECT 
        c2.id,
        COALESCE(SUM(
            CASE 
                WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
                WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
                ELSE 0
            END
        ), 0) AS calculated_balance
    FROM public.customers c2
    LEFT JOIN public.transactions t ON c2.id = t.customer_id
    GROUP BY c2.id
) calc
WHERE c.id = calc.id 
AND ABS(c.balance - calc.calculated_balance) > 0.01;

-- Step 3: Create trigger to auto-update customer balance on transaction changes
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add to customer balance
        IF NEW.transaction_type IN ('sale', 'credit_sale') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) + NEW.amount 
            WHERE id = NEW.customer_id;
        ELSIF NEW.transaction_type IN ('payment', 'advance') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) - NEW.amount 
            WHERE id = NEW.customer_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old transaction
        IF OLD.transaction_type IN ('sale', 'credit_sale') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) - OLD.amount 
            WHERE id = OLD.customer_id;
        ELSIF OLD.transaction_type IN ('payment', 'advance') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) + OLD.amount 
            WHERE id = OLD.customer_id;
        END IF;
        
        -- Apply new transaction
        IF NEW.transaction_type IN ('sale', 'credit_sale') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) + NEW.amount 
            WHERE id = NEW.customer_id;
        ELSIF NEW.transaction_type IN ('payment', 'advance') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) - NEW.amount 
            WHERE id = NEW.customer_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse transaction
        IF OLD.transaction_type IN ('sale', 'credit_sale') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) - OLD.amount 
            WHERE id = OLD.customer_id;
        ELSIF OLD.transaction_type IN ('payment', 'advance') THEN
            UPDATE public.customers 
            SET balance = COALESCE(balance, 0) + OLD.amount 
            WHERE id = OLD.customer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_customer_balance ON public.transactions;

-- Create trigger
CREATE TRIGGER trg_update_customer_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance();

-- Step 4: Create helper function to get customer balance
CREATE OR REPLACE FUNCTION get_customer_balance(customer_id_param INT)
RETURNS NUMERIC AS $$
    SELECT COALESCE(balance, 0)
    FROM public.customers
    WHERE id = customer_id_param;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Step 5: Create view for customer balance verification
CREATE OR REPLACE VIEW v_customer_balance_verification AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.category,
    c.balance AS current_balance,
    COALESCE(SUM(
        CASE 
            WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
            WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
            ELSE 0
        END
    ), 0) AS transaction_sum,
    ABS(c.balance - COALESCE(SUM(
        CASE 
            WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
            WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
            ELSE 0
        END
    ), 0)) AS balance_difference,
    CASE 
        WHEN ABS(c.balance - COALESCE(SUM(
            CASE 
                WHEN t.transaction_type IN ('sale', 'credit_sale') THEN t.amount
                WHEN t.transaction_type IN ('payment', 'advance') THEN -t.amount
                ELSE 0
            END
        ), 0)) < 0.01 THEN 'OK'
        ELSE 'MISMATCH'
    END AS status
FROM public.customers c
LEFT JOIN public.transactions t ON c.id = t.customer_id
GROUP BY c.id, c.name, c.phone, c.category, c.balance;

-- Verification query
SELECT 
    COUNT(*) AS total_customers,
    COUNT(CASE WHEN status = 'OK' THEN 1 END) AS correct_balances,
    COUNT(CASE WHEN status = 'MISMATCH' THEN 1 END) AS mismatches
FROM v_customer_balance_verification;

-- Show mismatches if any
SELECT * FROM v_customer_balance_verification WHERE status = 'MISMATCH';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Customer Balance Fix - Completed Successfully!';
    RAISE NOTICE 'All customer balances have been recalculated and fixed.';
    RAISE NOTICE 'Trigger created to auto-update balances on future transactions.';
END $$;
