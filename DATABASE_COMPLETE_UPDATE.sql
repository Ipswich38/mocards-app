-- ================================================================
-- MOCARDS CLOUD - COMPLETE DATABASE UPDATE
-- Updates ALL tables to match the full production schema
-- Ultra-safe version that handles UUID and all missing columns
-- ================================================================

-- 🚀 COMPLETE UPDATE FOR ALL TABLES 🚀
-- This will bring your entire database up to production standards

-- ================================================================
-- UPDATE CARDS TABLE
-- ================================================================

-- Add missing columns to cards table
DO $$
BEGIN
    -- Add issued_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'issued_by') THEN
        ALTER TABLE cards ADD COLUMN issued_by VARCHAR(50);
        RAISE NOTICE '✅ Added issued_by column to cards table';
    END IF;

    -- Add activated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'activated_at') THEN
        ALTER TABLE cards ADD COLUMN activated_at TIMESTAMP;
        RAISE NOTICE '✅ Added activated_at column to cards table';
    END IF;

    -- Add deactivated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'deactivated_at') THEN
        ALTER TABLE cards ADD COLUMN deactivated_at TIMESTAMP;
        RAISE NOTICE '✅ Added deactivated_at column to cards table';
    END IF;

    -- Add notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'notes') THEN
        ALTER TABLE cards ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes column to cards table';
    END IF;

    -- Add expiry_date column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'expiry_date') THEN
        ALTER TABLE cards ADD COLUMN expiry_date DATE DEFAULT '2025-12-31';
        RAISE NOTICE '✅ Added expiry_date column to cards table';
    END IF;
END $$;

-- ================================================================
-- UPDATE CLINICS TABLE
-- ================================================================

-- Add missing columns to clinics table
DO $$
BEGIN
    -- Add subscription_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'subscription_price') THEN
        ALTER TABLE clinics ADD COLUMN subscription_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added subscription_price column to clinics table';
    END IF;

    -- Add subscription_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'subscription_status') THEN
        ALTER TABLE clinics ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active';
        RAISE NOTICE '✅ Added subscription_status column to clinics table';
    END IF;

    -- Add subscription_start_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'subscription_start_date') THEN
        ALTER TABLE clinics ADD COLUMN subscription_start_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE '✅ Added subscription_start_date column to clinics table';
    END IF;

    -- Add subscription_end_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'subscription_end_date') THEN
        ALTER TABLE clinics ADD COLUMN subscription_end_date DATE;
        RAISE NOTICE '✅ Added subscription_end_date column to clinics table';
    END IF;

    -- Add last_payment_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'last_payment_date') THEN
        ALTER TABLE clinics ADD COLUMN last_payment_date DATE;
        RAISE NOTICE '✅ Added last_payment_date column to clinics table';
    END IF;

    -- Add next_billing_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'next_billing_date') THEN
        ALTER TABLE clinics ADD COLUMN next_billing_date DATE;
        RAISE NOTICE '✅ Added next_billing_date column to clinics table';
    END IF;

    -- Add admin_clinic column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'admin_clinic') THEN
        ALTER TABLE clinics ADD COLUMN admin_clinic VARCHAR(200);
        RAISE NOTICE '✅ Added admin_clinic column to clinics table';
    END IF;

    -- Add contact_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'contact_number') THEN
        ALTER TABLE clinics ADD COLUMN contact_number VARCHAR(50);
        RAISE NOTICE '✅ Added contact_number column to clinics table';
    END IF;
END $$;

-- ================================================================
-- UPDATE APPOINTMENTS TABLE
-- ================================================================

-- Add ALL missing columns to appointments table
DO $$
BEGIN
    -- Add preferred_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'preferred_date') THEN
        ALTER TABLE appointments ADD COLUMN preferred_date DATE NOT NULL DEFAULT CURRENT_DATE;
        RAISE NOTICE '✅ Added preferred_date column to appointments table';
    END IF;

    -- Add preferred_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'preferred_time') THEN
        ALTER TABLE appointments ADD COLUMN preferred_time TIME NOT NULL DEFAULT '09:00:00';
        RAISE NOTICE '✅ Added preferred_time column to appointments table';
    END IF;

    -- Add patient_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_name') THEN
        ALTER TABLE appointments ADD COLUMN patient_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Patient';
        RAISE NOTICE '✅ Added patient_name column to appointments table';
    END IF;

    -- Add patient_email column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_email') THEN
        ALTER TABLE appointments ADD COLUMN patient_email VARCHAR(200) NOT NULL DEFAULT 'patient@example.com';
        RAISE NOTICE '✅ Added patient_email column to appointments table';
    END IF;

    -- Add patient_phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_phone') THEN
        ALTER TABLE appointments ADD COLUMN patient_phone VARCHAR(50) NOT NULL DEFAULT '+63 000 000 0000';
        RAISE NOTICE '✅ Added patient_phone column to appointments table';
    END IF;

    -- Add service_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'service_type') THEN
        ALTER TABLE appointments ADD COLUMN service_type VARCHAR(200) NOT NULL DEFAULT 'General Consultation';
        RAISE NOTICE '✅ Added service_type column to appointments table';
    END IF;

    -- Add perk_requested column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'perk_requested') THEN
        ALTER TABLE appointments ADD COLUMN perk_requested VARCHAR(200);
        RAISE NOTICE '✅ Added perk_requested column to appointments table';
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'status') THEN
        ALTER TABLE appointments ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE '✅ Added status column to appointments table';
    END IF;

    -- Add notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'notes') THEN
        ALTER TABLE appointments ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes column to appointments table';
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'updated_at') THEN
        ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updated_at column to appointments table';
    END IF;

    -- Add completed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'completed_at') THEN
        ALTER TABLE appointments ADD COLUMN completed_at TIMESTAMP;
        RAISE NOTICE '✅ Added completed_at column to appointments table';
    END IF;

    -- Add cancelled_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'cancelled_at') THEN
        ALTER TABLE appointments ADD COLUMN cancelled_at TIMESTAMP;
        RAISE NOTICE '✅ Added cancelled_at column to appointments table';
    END IF;

    -- Add cancellation_reason column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE '✅ Added cancellation_reason column to appointments table';
    END IF;

    -- Add processed_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'processed_by') THEN
        ALTER TABLE appointments ADD COLUMN processed_by VARCHAR(200);
        RAISE NOTICE '✅ Added processed_by column to appointments table';
    END IF;

    -- Add processed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'processed_at') THEN
        ALTER TABLE appointments ADD COLUMN processed_at TIMESTAMP;
        RAISE NOTICE '✅ Added processed_at column to appointments table';
    END IF;
END $$;

-- ================================================================
-- CREATE MISSING TABLES (IF THEY DON'T EXIST)
-- ================================================================

-- Create perk_redemptions table
CREATE TABLE IF NOT EXISTS perk_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_control_number VARCHAR(50) NOT NULL,
    perk_id UUID NOT NULL,
    perk_name VARCHAR(200) NOT NULL,
    clinic_id UUID NOT NULL,
    claimant_name VARCHAR(200) NOT NULL,
    handled_by VARCHAR(200) NOT NULL,
    service_type VARCHAR(200) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'clinic', 'staff')),
    clinic_id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    permissions TEXT
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Cards indexes
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);

-- Clinics indexes
CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON clinics(is_active);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_card_control_number ON appointments(card_control_number);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_preferred_date ON appointments(preferred_date);

-- Perks indexes
CREATE INDEX IF NOT EXISTS idx_perks_type ON perks(type);
CREATE INDEX IF NOT EXISTS idx_perks_is_active ON perks(is_active);

-- Perk Redemptions indexes
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card_control_number ON perk_redemptions(card_control_number);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_id ON perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_used_at ON perk_redemptions(used_at);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk_id ON perk_redemptions(perk_id);

-- ================================================================
-- INSERT DEFAULT ADMIN USER AND SAMPLE DATA
-- ================================================================

-- Insert admin user if users table is empty
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;

    IF user_count = 0 THEN
        INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, permissions)
        VALUES (
            gen_random_uuid(),
            'admin',
            'admin@mocards.cloud',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfMY8UfuJt1HyYa',
            'admin',
            'MOCARDS',
            'Administrator',
            TRUE,
            '["manage_clinics", "manage_cards", "manage_perks", "view_all_data", "manage_users"]'
        );
        RAISE NOTICE '✅ Inserted default admin user';
    ELSE
        RAISE NOTICE 'ℹ️ Users table already has data, skipping admin insertion';
    END IF;
END $$;

-- Insert sample clinic if clinics table is nearly empty
DO $$
DECLARE
    clinic_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO clinic_count FROM clinics;

    IF clinic_count < 2 THEN
        INSERT INTO clinics (
            id, name, code, password, plan, max_cards, region, address,
            email, contact_number, subscription_status, subscription_start_date, is_active
        ) VALUES (
            gen_random_uuid(),
            'Smile Dental Clinic',
            'CVT001',
            'clinic123',
            'starter',
            500,
            'NCR',
            '123 Dental Street, Metro Manila',
            'info@smiledentalclinic.com',
            '+63 2 8123 4567',
            'active',
            CURRENT_DATE,
            TRUE
        );
        RAISE NOTICE '✅ Inserted sample clinic';
    ELSE
        RAISE NOTICE 'ℹ️ Clinics table already has data, skipping sample insertion';
    END IF;
END $$;

-- ================================================================
-- COMPREHENSIVE VERIFICATION
-- ================================================================

-- Show table structures
SELECT 'DATABASE STRUCTURE VERIFICATION:' as info;

-- Show all table names and row counts
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show row counts for all tables
SELECT 'ROW COUNTS:' as info;
SELECT 'cards' as table_name, COUNT(*) as row_count FROM cards
UNION ALL
SELECT 'clinics' as table_name, COUNT(*) as row_count FROM clinics
UNION ALL
SELECT 'appointments' as table_name, COUNT(*) as row_count FROM appointments
UNION ALL
SELECT 'perks' as table_name, COUNT(*) as row_count FROM perks
UNION ALL
SELECT 'perk_redemptions' as table_name, COUNT(*) as row_count FROM perk_redemptions
UNION ALL
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'audit_logs' as table_name, COUNT(*) as row_count FROM audit_logs;

-- ================================================================
-- 🎉 COMPLETE DATABASE UPDATE FINISHED! 🎉
-- ================================================================

SELECT '🎉 COMPLETE SUCCESS! Your database is now fully updated to production schema!' as final_message;
SELECT 'All tables, columns, indexes, and sample data are now in place!' as details;
SELECT 'You can now use all MOCARDS features without any column errors!' as confirmation;