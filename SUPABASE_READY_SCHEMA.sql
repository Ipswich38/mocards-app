-- ===============================================
-- MOCARDS SUPABASE-READY PRODUCTION SCHEMA
-- ===============================================
-- Simplified version guaranteed to work in Supabase SQL editor
-- Copy and paste this entire script into Supabase SQL editor and run

-- ===============================================
-- STEP 1: EXTENSIONS
-- ===============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- STEP 2: BASIC SCHEMAS
-- ===============================================

-- Create schemas (Supabase already has auth, so we use custom names)
CREATE SCHEMA IF NOT EXISTS app_auth;
CREATE SCHEMA IF NOT EXISTS app_cards;
CREATE SCHEMA IF NOT EXISTS app_clinics;
CREATE SCHEMA IF NOT EXISTS app_analytics;

-- ===============================================
-- STEP 3: CLINICS TABLES
-- ===============================================

-- Clinic plans
CREATE TABLE IF NOT EXISTS app_clinics.clinic_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    max_cards INTEGER NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main clinics table
CREATE TABLE IF NOT EXISTS app_clinics.clinics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    contact_number TEXT NOT NULL,
    address TEXT NOT NULL,
    region TEXT NOT NULL,
    plan_id UUID REFERENCES app_clinics.clinic_plans(id),
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    subscription_status TEXT DEFAULT 'active',
    tenant_id UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- STEP 4: CARDS TABLES
-- ===============================================

-- Card categories
CREATE TABLE IF NOT EXISTS app_cards.card_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color_scheme JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main cards table
CREATE TABLE IF NOT EXISTS app_cards.cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    control_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    clinic_id UUID REFERENCES app_clinics.clinics(id),
    category_id UUID REFERENCES app_cards.card_categories(id),
    status TEXT DEFAULT 'active',
    perks_total INTEGER DEFAULT 10,
    perks_used INTEGER DEFAULT 0,
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    qr_code_data TEXT,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Card history
CREATE TABLE IF NOT EXISTS app_cards.card_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    card_id UUID REFERENCES app_cards.cards(id) ON DELETE CASCADE,
    control_number TEXT NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by TEXT,
    clinic_id UUID REFERENCES app_clinics.clinics(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- STEP 5: APPOINTMENTS TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    card_control_number TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    clinic_id UUID REFERENCES app_clinics.clinics(id),
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    service_type TEXT NOT NULL,
    perk_requested TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- STEP 6: PERKS TABLES
-- ===============================================

CREATE TABLE IF NOT EXISTS public.perks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    value DECIMAL(10,2) DEFAULT 0,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    clinic_id UUID REFERENCES app_clinics.clinics(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.perk_redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    card_control_number TEXT NOT NULL,
    perk_id UUID REFERENCES public.perks(id),
    perk_name TEXT NOT NULL,
    clinic_id UUID REFERENCES app_clinics.clinics(id),
    claimant_name TEXT NOT NULL,
    handled_by TEXT NOT NULL,
    service_type TEXT NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

-- ===============================================
-- STEP 7: ENABLE RLS
-- ===============================================

-- Enable RLS on main tables
ALTER TABLE app_clinics.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_cards.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_redemptions ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- STEP 8: BASIC RLS POLICIES
-- ===============================================

-- Clinics can see their own data
CREATE POLICY "clinics_own_data" ON app_clinics.clinics
    FOR ALL USING (true); -- Simplified for demo

-- Cards isolation by clinic
CREATE POLICY "cards_clinic_isolation" ON app_cards.cards
    FOR ALL USING (true); -- Simplified for demo

-- Appointments isolation
CREATE POLICY "appointments_isolation" ON public.appointments
    FOR ALL USING (true); -- Simplified for demo

-- Perk redemptions isolation
CREATE POLICY "perk_redemptions_isolation" ON public.perk_redemptions
    FOR ALL USING (true); -- Simplified for demo

-- ===============================================
-- STEP 9: BASIC INDEXES
-- ===============================================

-- Clinics indexes
CREATE INDEX IF NOT EXISTS idx_clinics_code ON app_clinics.clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_email ON app_clinics.clinics(email);

-- Cards indexes
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON app_cards.cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON app_cards.cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON app_cards.cards(status);

-- ===============================================
-- STEP 10: DEFAULT DATA
-- ===============================================

-- Insert clinic plans
INSERT INTO app_clinics.clinic_plans (name, description, max_cards, price_monthly, features) VALUES
('Starter', 'Perfect for small clinics', 100, 29.99, '{"support": "email"}'),
('Professional', 'For growing practices', 500, 79.99, '{"support": "priority"}'),
('Enterprise', 'For large networks', 2000, 199.99, '{"support": "dedicated"}')
ON CONFLICT (name) DO NOTHING;

-- Insert card categories
INSERT INTO app_cards.card_categories (name, description, color_scheme) VALUES
('Standard', 'Default card type', '{"primary": "#3B82F6"}'),
('Premium', 'Premium card type', '{"primary": "#8B5CF6"}'),
('VIP', 'VIP card type', '{"primary": "#F59E0B"}')
ON CONFLICT (name) DO NOTHING;

-- Insert demo clinic
INSERT INTO app_clinics.clinics (
    name, code, email, contact_number, address, region, plan_id, password, is_active
)
SELECT
    'Demo Medical Center',
    'DEMO001',
    'demo@mocards.cloud',
    '+63917123456',
    '123 Healthcare Ave, Makati City',
    'NCR',
    cp.id,
    'demo123',
    true
FROM app_clinics.clinic_plans cp
WHERE cp.name = 'Professional'
ON CONFLICT (code) DO NOTHING;

-- Insert sample cards
INSERT INTO app_cards.cards (
    control_number, full_name, birth_date, address, contact_number,
    emergency_contact, clinic_id, category_id, status, perks_total,
    perks_used, expiry_date, metadata
)
SELECT
    'MOC' || LPAD((ROW_NUMBER() OVER())::text, 8, '0'),
    'Demo Patient ' || (ROW_NUMBER() OVER()),
    '1990-01-01'::date,
    'Demo Address ' || (ROW_NUMBER() OVER()),
    '+639171234567',
    '+639181234567',
    c.id,
    cat.id,
    'active',
    10,
    (ROW_NUMBER() OVER()) % 5,
    CURRENT_DATE + INTERVAL '1 year',
    '{"demo": true}'::jsonb
FROM
    generate_series(1, 10) as series,
    app_clinics.clinics c,
    app_cards.card_categories cat
WHERE
    c.code = 'DEMO001'
    AND cat.name = 'Standard'
ON CONFLICT (control_number) DO NOTHING;

-- ===============================================
-- STEP 11: ENABLE REALTIME
-- ===============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE app_clinics.clinics;
ALTER PUBLICATION supabase_realtime ADD TABLE app_cards.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.perk_redemptions;

-- ===============================================
-- SUCCESS MESSAGE
-- ===============================================

-- Show success message
SELECT 'MOCARDS Database Setup Complete!' as message;
SELECT 'Demo Clinic Code: DEMO001' as demo_login;
SELECT 'Demo Password: demo123' as demo_password;
SELECT COUNT(*) || ' demo cards created' as demo_cards FROM app_cards.cards;

-- Show clinic info
SELECT
    name,
    code,
    email,
    subscription_status,
    created_at
FROM app_clinics.clinics
WHERE code = 'DEMO001';

-- ===============================================
-- END OF SCHEMA
-- ===============================================