-- ===================================================================
-- MISSING MOCARDS SCHEMA COMPONENTS
-- Essential tables required by the application but not in basic setup
-- ===================================================================

-- Add missing columns to mocards_clinics table for production features
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS business_license VARCHAR(100),
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS monthly_card_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS cards_issued_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0.00;

-- Create clinic subscription plans table
CREATE TABLE IF NOT EXISTS public.clinic_subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name VARCHAR(50) NOT NULL,
  monthly_card_limit INTEGER NOT NULL,
  price_per_month DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create clinic sales table for tracking individual transactions
CREATE TABLE IF NOT EXISTS public.clinic_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.mocards_clinics(id),
  card_id UUID REFERENCES public.cards(id),
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  sale_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'completed'
);

-- Create clinic perk redemptions table
CREATE TABLE IF NOT EXISTS public.clinic_perk_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.mocards_clinics(id),
  card_id UUID REFERENCES public.cards(id),
  perk_id UUID REFERENCES public.card_perks(id),
  service_provided VARCHAR(255),
  service_value DECIMAL(10,2),
  redeemed_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Create clinic monthly reports table
CREATE TABLE IF NOT EXISTS public.clinic_monthly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.mocards_clinics(id),
  report_month INTEGER NOT NULL,
  report_year INTEGER NOT NULL,
  cards_sold INTEGER DEFAULT 0,
  cards_activated INTEGER DEFAULT 0,
  perks_redeemed INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  commission_paid DECIMAL(10,2) DEFAULT 0.00,
  generated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, report_month, report_year)
);

-- Insert default subscription plans
INSERT INTO public.clinic_subscription_plans (plan_name, monthly_card_limit, price_per_month, commission_rate, features) VALUES
('Basic', 100, 299.00, 15.00, '{"analytics": false, "custom_branding": false, "priority_support": false}'),
('Professional', 500, 799.00, 12.00, '{"analytics": true, "custom_branding": false, "priority_support": false}'),
('Enterprise', 2000, 1999.00, 10.00, '{"analytics": true, "custom_branding": true, "priority_support": true}')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_sales_clinic_id ON public.clinic_sales(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_sales_date ON public.clinic_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_id ON public.clinic_perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_date ON public.clinic_perk_redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_clinic_date ON public.clinic_monthly_reports(clinic_id, report_year, report_month);

-- Enable RLS for new tables
ALTER TABLE public.clinic_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_perk_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow all access to subscription plans" ON public.clinic_subscription_plans;
  DROP POLICY IF EXISTS "Allow all access to clinic sales" ON public.clinic_sales;
  DROP POLICY IF EXISTS "Allow all access to perk redemptions" ON public.clinic_perk_redemptions;
  DROP POLICY IF EXISTS "Allow all access to monthly reports" ON public.clinic_monthly_reports;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Allow all access to subscription plans" ON public.clinic_subscription_plans FOR ALL USING (true);
CREATE POLICY "Allow all access to clinic sales" ON public.clinic_sales FOR ALL USING (true);
CREATE POLICY "Allow all access to perk redemptions" ON public.clinic_perk_redemptions FOR ALL USING (true);
CREATE POLICY "Allow all access to monthly reports" ON public.clinic_monthly_reports FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.clinic_subscription_plans TO anon, authenticated;
GRANT ALL ON public.clinic_sales TO anon, authenticated;
GRANT ALL ON public.clinic_perk_redemptions TO anon, authenticated;
GRANT ALL ON public.clinic_monthly_reports TO anon, authenticated;

-- Verification
SELECT 'Missing schema components added successfully!' as status;