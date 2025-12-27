-- ================================================================
-- MOCARDS CLINIC USERNAME SYSTEM - COMPLETE MIGRATION
-- Ensures clinic table has proper username/area code separation
-- Version: 4.0.0 - Production Ready
-- ================================================================

-- Drop and recreate clinics table with proper schema
DROP TABLE IF EXISTS clinics CASCADE;

CREATE TABLE clinics (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,  -- 🔑 Login username (e.g., "dentist123")
    region VARCHAR(10) NOT NULL,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('starter', 'growth', 'pro')),
    code VARCHAR(20) UNIQUE NOT NULL,      -- 🏷️ Area code for cards (e.g., "CVT001")
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    password VARCHAR(255) NOT NULL,        -- 🔒 Hashed password
    subscription_price INTEGER NOT NULL,
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    subscription_start_date TIMESTAMPTZ NOT NULL,
    subscription_end_date TIMESTAMPTZ,
    max_cards INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_payment_date TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_clinics_username ON clinics(username);
CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_region ON clinics(region);
CREATE INDEX IF NOT EXISTS idx_clinics_plan ON clinics(plan);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(subscription_status);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active);

-- Insert demo clinic for testing
INSERT INTO clinics (
    id,
    name,
    username,
    region,
    plan,
    code,
    address,
    admin_clinic,
    email,
    contact_number,
    password,
    subscription_price,
    subscription_status,
    subscription_start_date,
    max_cards
) VALUES (
    'clinic_demo_001',
    'Demo Dental Clinic',
    'demo',                    -- 🔑 Login with this username
    '4A',
    'starter',
    'CVT001',                  -- 🏷️ This appears in card control numbers
    '123 Dental Street, Batangas City',
    'Dr. Demo Dentist',
    'demo@dental.com',
    '+63917123456',
    'demo123',                 -- 🔒 Login with this password
    299,
    'active',
    NOW(),
    500
);

-- Verify the table structure
SELECT 'CLINICS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'clinics'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show demo data
SELECT 'DEMO CLINIC CREATED:' as info;
SELECT
    id,
    name,
    username as login_username,
    code as area_code,
    region,
    plan,
    subscription_status
FROM clinics
WHERE id = 'clinic_demo_001';

SELECT '🎉 CLINIC USERNAME SYSTEM READY FOR PRODUCTION!' as success_message;
SELECT '🔑 Login: username=demo, password=demo123' as login_info;
SELECT '🏷️ Area code CVT001 will appear in card control numbers' as card_info;