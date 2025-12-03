-- ===================================================================
-- MOCARDS COMPLETE SCHEMA - With correct password hashes
-- Creates tables in public schema and includes demo card data
-- ===================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. DROP AND RECREATE MOCARDS TABLES IN PUBLIC SCHEMA
-- ===================================================================

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.card_transactions CASCADE;
DROP TABLE IF EXISTS public.card_perks CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.card_batches CASCADE;
DROP TABLE IF EXISTS public.mocards_clinics CASCADE;
DROP TABLE IF EXISTS public.mocards_admin_users CASCADE;

-- Create admin users table
CREATE TABLE public.mocards_admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create clinics table
CREATE TABLE public.mocards_clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_code VARCHAR(20) UNIQUE NOT NULL,
  clinic_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create card batches table
CREATE TABLE public.card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(20) UNIQUE NOT NULL,
  total_cards INTEGER NOT NULL,
  created_by UUID REFERENCES public.mocards_admin_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create cards table
CREATE TABLE public.cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.card_batches(id),
  control_number VARCHAR(20) UNIQUE NOT NULL,
  passcode VARCHAR(6) NOT NULL,
  location_code VARCHAR(10) DEFAULT 'MO',
  status VARCHAR(20) DEFAULT 'unactivated',
  assigned_clinic_id UUID REFERENCES public.mocards_clinics(id),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create card perks table
CREATE TABLE public.card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  perk_type VARCHAR(50) NOT NULL,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  claimed_by_clinic UUID REFERENCES public.mocards_clinics(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create card transactions table
CREATE TABLE public.card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id),
  transaction_type VARCHAR(50) NOT NULL,
  performed_by VARCHAR(50) NOT NULL,
  performed_by_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 2. CREATE INDEXES
-- ===================================================================
CREATE INDEX idx_cards_control_number ON public.cards(control_number);
CREATE INDEX idx_cards_status ON public.cards(status);
CREATE INDEX idx_cards_clinic ON public.cards(assigned_clinic_id);
CREATE INDEX idx_card_perks_card_id ON public.card_perks(card_id);
CREATE INDEX idx_mocards_clinics_code ON public.mocards_clinics(clinic_code);

-- ===================================================================
-- 3. ENABLE ROW LEVEL SECURITY & POLICIES
-- ===================================================================
ALTER TABLE public.mocards_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mocards_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for demo
CREATE POLICY "Allow all access to admin users" ON public.mocards_admin_users FOR ALL USING (true);
CREATE POLICY "Allow all access to clinics" ON public.mocards_clinics FOR ALL USING (true);
CREATE POLICY "Allow all access to card batches" ON public.card_batches FOR ALL USING (true);
CREATE POLICY "Allow all access to cards" ON public.cards FOR ALL USING (true);
CREATE POLICY "Allow all access to card perks" ON public.card_perks FOR ALL USING (true);
CREATE POLICY "Allow all access to card transactions" ON public.card_transactions FOR ALL USING (true);

-- ===================================================================
-- 4. GRANT PERMISSIONS
-- ===================================================================
GRANT ALL ON public.mocards_admin_users TO anon, authenticated;
GRANT ALL ON public.mocards_clinics TO anon, authenticated;
GRANT ALL ON public.card_batches TO anon, authenticated;
GRANT ALL ON public.cards TO anon, authenticated;
GRANT ALL ON public.card_perks TO anon, authenticated;
GRANT ALL ON public.card_transactions TO anon, authenticated;

-- ===================================================================
-- 5. INSERT DEMO DATA WITH CORRECT BCRYPT HASHES
-- ===================================================================

-- Insert admin user (password: admin123) with CORRECT bcrypt hash
INSERT INTO public.mocards_admin_users (username, password_hash, role) VALUES
('admin', '$2b$10$IbXR44BE.7wOjS1HVAIDReebZpoMdrIulnQ//rC/ckAdb8LWoxJfu', 'superadmin');

-- Insert demo clinic (password: demo123) with CORRECT bcrypt hash
INSERT INTO public.mocards_clinics (clinic_code, clinic_name, password_hash, contact_email, address) VALUES
('DEMO001', 'Demo Dental Clinic', '$2b$10$nb0Csc1UMFg5HMUsvmOE3em6wm4y.dBo37fT6H5QrRdqDLqbJobQG', 'demo@clinic.com', '123 Demo Street, Demo City');

-- Get the admin and clinic IDs for foreign keys
DO $$
DECLARE
    v_admin_id UUID;
    v_clinic_id UUID;
    v_batch_id UUID;
    v_card_id UUID;
BEGIN
    -- Get admin ID
    SELECT id INTO v_admin_id FROM public.mocards_admin_users WHERE username = 'admin';

    -- Get clinic ID
    SELECT id INTO v_clinic_id FROM public.mocards_clinics WHERE clinic_code = 'DEMO001';

    -- Create demo card batch
    INSERT INTO public.card_batches (batch_number, total_cards, created_by)
    VALUES ('MO-B000001', 1, v_admin_id)
    RETURNING id INTO v_batch_id;

    -- Create demo card (Control: MO-C000001-001, Passcode: 123456)
    INSERT INTO public.cards (
        batch_id,
        control_number,
        passcode,
        location_code,
        status,
        assigned_clinic_id,
        activated_at,
        expires_at
    ) VALUES (
        v_batch_id,
        'MO-C000001-001',
        '123456',
        'MO',
        'activated',
        v_clinic_id,
        NOW(),
        NOW() + INTERVAL '1 year'
    ) RETURNING id INTO v_card_id;

    -- Create perks for the demo card
    INSERT INTO public.card_perks (card_id, perk_type, claimed) VALUES
        (v_card_id, 'consultation', false),
        (v_card_id, 'cleaning', false),
        (v_card_id, 'extraction', false),
        (v_card_id, 'fluoride', false),
        (v_card_id, 'whitening', false),
        (v_card_id, 'xray', false),
        (v_card_id, 'denture', false),
        (v_card_id, 'braces', false);

    -- Update one perk as claimed by the clinic (fixed variable names)
    UPDATE public.card_perks
    SET claimed = true,
        claimed_at = NOW(),
        claimed_by_clinic = v_clinic_id
    WHERE card_id = v_card_id AND perk_type = 'fluoride';

    -- Log card creation transaction
    INSERT INTO public.card_transactions (card_id, transaction_type, performed_by, performed_by_id, details)
    VALUES (v_card_id, 'created', 'admin', v_admin_id, '{"action": "demo_card_created"}'::jsonb);

    -- Log activation transaction
    INSERT INTO public.card_transactions (card_id, transaction_type, performed_by, performed_by_id, details)
    VALUES (v_card_id, 'activated', 'clinic', v_clinic_id, '{"action": "demo_card_activated", "clinic_code": "DEMO001"}'::jsonb);

    RAISE NOTICE 'Demo data created successfully!';
    RAISE NOTICE 'Admin ID: %, Clinic ID: %, Card ID: %', v_admin_id, v_clinic_id, v_card_id;

END $$;

-- ===================================================================
-- 6. VERIFICATION QUERIES
-- ===================================================================

SELECT 'Setup Complete!' as status;

SELECT
    'Demo Admin:' as type,
    username,
    role,
    'admin / admin123' as login_credentials
FROM public.mocards_admin_users;

SELECT
    'Demo Clinic:' as type,
    clinic_code,
    clinic_name,
    'DEMO001 / demo123' as login_credentials
FROM public.mocards_clinics;

SELECT
    'Demo Card:' as type,
    control_number,
    passcode,
    status,
    'MO-C000001-001 / 123456' as patient_login
FROM public.cards;

SELECT
    'Card Perks:' as type,
    perk_type,
    claimed,
    CASE WHEN claimed THEN 'CLAIMED' ELSE 'AVAILABLE' END as status
FROM public.card_perks
ORDER BY perk_type;

SELECT COUNT(*) || ' transactions logged' as transaction_log FROM public.card_transactions;

-- ===================================================================
-- 7. UPDATE PASSWORD HASHES (if needed for existing data)
-- ===================================================================

-- Update admin user password with correct bcrypt hash
UPDATE public.mocards_admin_users
SET password_hash = '$2b$10$IbXR44BE.7wOjS1HVAIDReebZpoMdrIulnQ//rC/ckAdb8LWoxJfu'
WHERE username = 'admin';

-- Update demo clinic password with correct bcrypt hash
UPDATE public.mocards_clinics
SET password_hash = '$2b$10$nb0Csc1UMFg5HMUsvmOE3em6wm4y.dBo37fT6H5QrRdqDLqbJobQG'
WHERE clinic_code = 'DEMO001';

-- Verify password updates
SELECT
    'Password Updates Complete' as status,
    (SELECT COUNT(*) FROM public.mocards_admin_users WHERE username = 'admin') as admin_count,
    (SELECT COUNT(*) FROM public.mocards_clinics WHERE clinic_code = 'DEMO001') as clinic_count;

-- ===================================================================
-- DEMO CREDENTIALS SUMMARY:
-- 🔑 Admin Login: admin / admin123
-- 🏥 Clinic Login: DEMO001 / demo123
-- 💳 Card Lookup: MO-C000001-001 / 123456
--
-- The demo card is pre-activated with 8 perks (1 claimed, 7 available)
-- All passwords use proper bcrypt hashing for security
-- ===================================================================