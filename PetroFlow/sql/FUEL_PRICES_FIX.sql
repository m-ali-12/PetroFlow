-- ============================================================================
-- PRICE HISTORY FIX & SETUP
-- Creates/fixes the fuel_prices table with proper structure
-- ============================================================================

-- Create fuel_prices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.fuel_prices (
    id BIGSERIAL PRIMARY KEY,
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel')),
    price_date DATE NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    added_by_user TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID DEFAULT public.get_my_company(),
    UNIQUE(fuel_type, price_date, company_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fuel_prices_fuel_type ON public.fuel_prices(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_date ON public.fuel_prices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_company ON public.fuel_prices(company_id);

-- Add comments
COMMENT ON TABLE public.fuel_prices IS 'Fuel price history for Petrol and Diesel';
COMMENT ON COLUMN public.fuel_prices.fuel_type IS 'Type of fuel: petrol or diesel';
COMMENT ON COLUMN public.fuel_prices.price_date IS 'Date when price was set';
COMMENT ON COLUMN public.fuel_prices.price IS 'Price per liter in PKR';
COMMENT ON COLUMN public.fuel_prices.added_by_user IS 'User who added/edited this price';

-- Enable RLS
ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.fuel_prices;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.fuel_prices;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.fuel_prices;
DROP POLICY IF EXISTS "Allow delete for admin" ON public.fuel_prices;

CREATE POLICY "Allow read for authenticated" 
    ON public.fuel_prices FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow insert for authenticated" 
    ON public.fuel_prices FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for authenticated" 
    ON public.fuel_prices FOR UPDATE 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow delete for admin" 
    ON public.fuel_prices FOR DELETE 
    USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Create function to get current fuel price
CREATE OR REPLACE FUNCTION get_current_fuel_price(fuel_type_param TEXT)
RETURNS NUMERIC AS $$
    SELECT price
    FROM public.fuel_prices
    WHERE fuel_type = fuel_type_param
    ORDER BY price_date DESC
    LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create view for price history summary
CREATE OR REPLACE VIEW v_fuel_price_history AS
SELECT 
    fuel_type,
    price_date,
    price,
    added_by_user,
    LAG(price_date) OVER (PARTITION BY fuel_type ORDER BY price_date DESC) as next_price_date,
    (price_date - LAG(price_date) OVER (PARTITION BY fuel_type ORDER BY price_date DESC)) as days_active,
    ROW_NUMBER() OVER (PARTITION BY fuel_type ORDER BY price_date DESC) as price_rank
FROM public.fuel_prices
ORDER BY fuel_type, price_date DESC;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Fuel Prices Table Setup Complete!';
    RAISE NOTICE 'Table: public.fuel_prices created/verified';
    RAISE NOTICE 'RLS policies enabled for security';
    RAISE NOTICE 'Indexes created for performance';
    RAISE NOTICE 'Function get_current_fuel_price created';
    RAISE NOTICE 'View v_fuel_price_history created';
END $$;
