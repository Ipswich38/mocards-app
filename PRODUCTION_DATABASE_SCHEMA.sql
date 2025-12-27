-- ================================================================
-- MOCARDS PRODUCTION DATABASE SCHEMA - FINAL VERSION
-- Clean SQL with proper syntax and preserved functionality
-- ================================================================

-- Drop existing tables if they exist (for fresh setup)
-- WARNING: Only run this if you want to reset all data!
-- DROP TABLE IF EXISTS cards CASCADE;
-- DROP TABLE IF EXISTS clinics CASCADE;

-- MOCARDS CLINIC TABLE - Updated with Username System
CREATE TABLE IF NOT EXISTS clinics (
    id VARCHAR(50) PRIMARY KEY,
    clinic_name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    clinic_code VARCHAR(20) UNIQUE NOT NULL,
    region VARCHAR(10) NOT NULL,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('starter', 'growth', 'pro')),
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
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

-- MOCARDS CARDS TABLE
CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(50) PRIMARY KEY,
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    perks_total INTEGER DEFAULT 5,
    perks_used INTEGER DEFAULT 0,
    clinic_id VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    issued_by VARCHAR(50),
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    notes TEXT,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
);

-- APPOINTMENTS TABLE (if needed)
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(50) PRIMARY KEY,
    card_control_number VARCHAR(50) NOT NULL,
    clinic_id VARCHAR(50),
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255),
    patient_phone VARCHAR(50),
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    perk_requested VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'rescheduled', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    processed_by VARCHAR(50),
    processed_at TIMESTAMPTZ,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- PERKS TABLE
CREATE TABLE IF NOT EXISTS perks (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_for INTEGER DEFAULT 365,
    requires_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERK REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS perk_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    card_control_number VARCHAR(50) NOT NULL,
    perk_id VARCHAR(50) NOT NULL,
    perk_name VARCHAR(255) NOT NULL,
    clinic_id VARCHAR(50) NOT NULL,
    claimant_name VARCHAR(255) NOT NULL,
    handled_by VARCHAR(255) NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL,
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (perk_id) REFERENCES perks(id) ON DELETE CASCADE
);

-- Performance Indexes for Clinics
CREATE INDEX IF NOT EXISTS idx_clinics_username ON clinics(username);
CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(clinic_code);
CREATE INDEX IF NOT EXISTS idx_clinics_region ON clinics(region);
CREATE INDEX IF NOT EXISTS idx_clinics_plan ON clinics(plan);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(subscription_status);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active);

-- Performance Indexes for Cards
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_expiry_date ON cards(expiry_date);

-- Performance Indexes for Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_card_number ON appointments(card_control_number);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(preferred_date);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);

-- Performance Indexes for Perk Redemptions
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card_number ON perk_redemptions(card_control_number);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_id ON perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk_id ON perk_redemptions(perk_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_used_at ON perk_redemptions(used_at);

-- Insert Default Perks (Production Ready)
INSERT INTO perks (id, type, name, description, value, is_active, valid_for, requires_approval) VALUES
    ('perk_dental_cleaning', 'dental_cleaning', 'Free Dental Cleaning', 'Complete professional dental cleaning service', 1500.00, true, 365, false),
    ('perk_consultation', 'consultation', 'Free Dental Consultation', 'Comprehensive dental consultation and check-up', 500.00, true, 365, false),
    ('perk_xray', 'xray', 'X-Ray Imaging Service', 'Digital X-ray imaging for diagnosis', 800.00, true, 365, true),
    ('perk_treatment_discount', 'treatment', 'Treatment Discount', '20% discount on dental treatments and procedures', 20.00, true, 365, true),
    ('perk_general_discount', 'discount', 'General Service Discount', '10% discount on all dental services', 10.00, true, 365, false)
ON CONFLICT (id) DO NOTHING;

-- Insert Demo Clinic for Testing (Remove for production)
INSERT INTO clinics (
    id, clinic_name, username, clinic_code, region, plan, address, admin_clinic,
    email, contact_number, password_hash, subscription_price, subscription_status,
    subscription_start_date, max_cards
) VALUES (
    'clinic_demo_001',
    'Demo Dental Clinic',
    'demo',
    'CVT001',
    '4A',
    'starter',
    '123 Dental Street, Batangas City',
    'Dr. Demo Dentist',
    'demo@dental.com',
    '+63917123456',
    'demo123',
    299,
    'active',
    NOW(),
    500
) ON CONFLICT (id) DO NOTHING;

-- Verify Schema Creation
SELECT 'SCHEMA CREATION COMPLETE' as status;

-- Show table structures
SELECT 'CLINICS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clinics' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CARDS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cards' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show demo data
SELECT 'DEMO CLINIC CREATED:' as info;
SELECT
    id,
    clinic_name,
    username as login_username,
    clinic_code as area_code,
    region,
    plan,
    subscription_status
FROM clinics
WHERE id = 'clinic_demo_001';

SELECT 'PRODUCTION DATABASE READY!' as success_message;
SELECT 'Login: username=demo, password=demo123' as login_info;
SELECT 'Area code CVT001 for card generation' as card_info;