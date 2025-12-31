-- ===============================================
-- MOCARDS MINIMAL WORKING SCHEMA
-- ===============================================
-- No extensions, no conflicts, pure PostgreSQL

-- ===============================================
-- STEP 1: CLEAN SLATE - DROP EXISTING SAFELY
-- ===============================================

-- Drop existing policies silently
DO $$
BEGIN
    DROP POLICY IF EXISTS "mocards_clinics_policy_2024" ON app_clinics.clinics;
    DROP POLICY IF EXISTS "mocards_cards_policy_2024" ON public.cards;
    DROP POLICY IF EXISTS "mocards_clinics_policy_2025" ON app_clinics.clinics;
    DROP POLICY IF EXISTS "mocards_cards_policy_2025" ON public.cards;
    DROP POLICY IF EXISTS "mocards_clinics_policy_2025" ON clinics;
    DROP POLICY IF EXISTS "mocards_cards_policy_2025" ON cards;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ===============================================
-- STEP 2: CREATE SCHEMAS
-- ===============================================

CREATE SCHEMA IF NOT EXISTS app_clinics;

-- ===============================================
-- STEP 3: CREATE TABLES (PUBLIC SCHEMA ONLY)
-- ===============================================

-- Clinics table in app_clinics schema
CREATE TABLE IF NOT EXISTS app_clinics.clinics (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    contact_number TEXT NOT NULL,
    address TEXT NOT NULL,
    region TEXT NOT NULL,
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    subscription_status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cards table in public schema (Supabase client compatible)
CREATE TABLE IF NOT EXISTS public.cards (
    id SERIAL PRIMARY KEY,
    control_number TEXT UNIQUE NOT NULL,
    full_name TEXT DEFAULT '',
    birth_date DATE DEFAULT '1990-01-01',
    address TEXT DEFAULT '',
    contact_number TEXT DEFAULT '',
    emergency_contact TEXT DEFAULT '',
    clinic_id INTEGER REFERENCES app_clinics.clinics(id),
    status TEXT DEFAULT 'inactive',
    perks_total INTEGER DEFAULT 10,
    perks_used INTEGER DEFAULT 0,
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE DEFAULT '2025-12-31',
    qr_code_data TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- ===============================================
-- STEP 4: INSERT DEMO DATA
-- ===============================================

-- Insert demo clinic
INSERT INTO app_clinics.clinics (name, code, email, contact_number, address, region, password)
SELECT 'Demo Medical Center', 'DEMO001', 'demo@mocards.cloud', '+63917123456',
       '123 Healthcare Ave, Makati City', 'NCR', 'demo123'
WHERE NOT EXISTS (SELECT 1 FROM app_clinics.clinics WHERE code = 'DEMO001');

-- Insert 5 demo cards
INSERT INTO public.cards (control_number, full_name, clinic_id, metadata)
SELECT
    'MOC' || LPAD(generate_series::TEXT, 8, '0'),
    'Demo Patient ' || generate_series,
    (SELECT id FROM app_clinics.clinics WHERE code = 'DEMO001'),
    '{"demo": true}'::jsonb
FROM generate_series(1, 5)
WHERE NOT EXISTS (SELECT 1 FROM public.cards WHERE metadata->>'demo' = 'true');

-- ===============================================
-- SUCCESS MESSAGE
-- ===============================================

SELECT '🎉 MINIMAL SCHEMA DEPLOYED!' as "STATUS";
SELECT 'DEMO001 / demo123' as "LOGIN";
SELECT COUNT(*) as "DEMO_CARDS" FROM public.cards WHERE metadata->>'demo' = 'true';