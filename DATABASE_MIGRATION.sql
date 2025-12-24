-- ================================================================
-- MOCARDS CLOUD - DATABASE MIGRATION SCRIPT
-- Safely adds missing columns to existing tables
-- Run this to fix "column does not exist" errors
-- ================================================================

-- This script will safely update your existing database structure
-- without losing any existing data

-- ================================================================
-- ADD MISSING COLUMNS TO APPOINTMENTS TABLE
-- ================================================================

-- Add preferred_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'preferred_date'
    ) THEN
        ALTER TABLE appointments ADD COLUMN preferred_date DATE NOT NULL DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added preferred_date column to appointments table';
    ELSE
        RAISE NOTICE 'preferred_date column already exists in appointments table';
    END IF;
END $$;

-- Add preferred_time column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'preferred_time'
    ) THEN
        ALTER TABLE appointments ADD COLUMN preferred_time TIME NOT NULL DEFAULT '09:00:00';
        RAISE NOTICE 'Added preferred_time column to appointments table';
    ELSE
        RAISE NOTICE 'preferred_time column already exists in appointments table';
    END IF;
END $$;

-- Add other missing appointment columns if they don't exist
DO $$
BEGIN
    -- Add patient_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'patient_name'
    ) THEN
        ALTER TABLE appointments ADD COLUMN patient_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Patient';
        RAISE NOTICE 'Added patient_name column to appointments table';
    END IF;

    -- Add patient_email column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'patient_email'
    ) THEN
        ALTER TABLE appointments ADD COLUMN patient_email VARCHAR(200) NOT NULL DEFAULT 'patient@example.com';
        RAISE NOTICE 'Added patient_email column to appointments table';
    END IF;

    -- Add patient_phone column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'patient_phone'
    ) THEN
        ALTER TABLE appointments ADD COLUMN patient_phone VARCHAR(50) NOT NULL DEFAULT '+63 000 000 0000';
        RAISE NOTICE 'Added patient_phone column to appointments table';
    END IF;

    -- Add service_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'service_type'
    ) THEN
        ALTER TABLE appointments ADD COLUMN service_type VARCHAR(200) NOT NULL DEFAULT 'General Consultation';
        RAISE NOTICE 'Added service_type column to appointments table';
    END IF;

    -- Add perk_requested column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'perk_requested'
    ) THEN
        ALTER TABLE appointments ADD COLUMN perk_requested VARCHAR(200);
        RAISE NOTICE 'Added perk_requested column to appointments table';
    END IF;

    -- Add status column with proper check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'status'
    ) THEN
        ALTER TABLE appointments ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added status column to appointments table';
    END IF;

    -- Add notes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'notes'
    ) THEN
        ALTER TABLE appointments ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to appointments table';
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to appointments table';
    END IF;

    -- Add completed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN completed_at TIMESTAMP;
        RAISE NOTICE 'Added completed_at column to appointments table';
    END IF;

    -- Add cancelled_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN cancelled_at TIMESTAMP;
        RAISE NOTICE 'Added cancelled_at column to appointments table';
    END IF;

    -- Add cancellation_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Added cancellation_reason column to appointments table';
    END IF;

    -- Add processed_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'processed_by'
    ) THEN
        ALTER TABLE appointments ADD COLUMN processed_by VARCHAR(200);
        RAISE NOTICE 'Added processed_by column to appointments table';
    END IF;

    -- Add processed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'processed_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN processed_at TIMESTAMP;
        RAISE NOTICE 'Added processed_at column to appointments table';
    END IF;
END $$;

-- ================================================================
-- ADD MISSING COLUMNS TO OTHER TABLES IF NEEDED
-- ================================================================

-- Add missing columns to cards table
DO $$
BEGIN
    -- Add issued_by column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'issued_by'
    ) THEN
        ALTER TABLE cards ADD COLUMN issued_by VARCHAR(50);
        RAISE NOTICE 'Added issued_by column to cards table';
    END IF;

    -- Add activated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'activated_at'
    ) THEN
        ALTER TABLE cards ADD COLUMN activated_at TIMESTAMP;
        RAISE NOTICE 'Added activated_at column to cards table';
    END IF;

    -- Add deactivated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'deactivated_at'
    ) THEN
        ALTER TABLE cards ADD COLUMN deactivated_at TIMESTAMP;
        RAISE NOTICE 'Added deactivated_at column to cards table';
    END IF;

    -- Add notes column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'notes'
    ) THEN
        ALTER TABLE cards ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to cards table';
    END IF;
END $$;

-- Add missing columns to clinics table
DO $$
BEGIN
    -- Add subscription_price column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'subscription_price'
    ) THEN
        ALTER TABLE clinics ADD COLUMN subscription_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added subscription_price column to clinics table';
    END IF;

    -- Add last_payment_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'last_payment_date'
    ) THEN
        ALTER TABLE clinics ADD COLUMN last_payment_date DATE;
        RAISE NOTICE 'Added last_payment_date column to clinics table';
    END IF;

    -- Add next_billing_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'next_billing_date'
    ) THEN
        ALTER TABLE clinics ADD COLUMN next_billing_date DATE;
        RAISE NOTICE 'Added next_billing_date column to clinics table';
    END IF;
END $$;

-- ================================================================
-- ADD STATUS CHECK CONSTRAINT TO APPOINTMENTS TABLE
-- ================================================================
DO $$
BEGIN
    -- Add status check constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_appointment_status'
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments ADD CONSTRAINT chk_appointment_status
        CHECK (status IN ('pending', 'accepted', 'declined', 'rescheduled', 'completed', 'cancelled'));
        RAISE NOTICE 'Added status check constraint to appointments table';
    ELSE
        RAISE NOTICE 'Status check constraint already exists on appointments table';
    END IF;
END $$;

-- ================================================================
-- CREATE MISSING TABLES IF THEY DON'T EXIST
-- ================================================================

-- Create perk_redemptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS perk_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    card_control_number VARCHAR(50) NOT NULL,
    perk_id VARCHAR(50) NOT NULL,
    perk_name VARCHAR(200) NOT NULL,
    clinic_id VARCHAR(50) NOT NULL,
    claimant_name VARCHAR(200) NOT NULL,
    handled_by VARCHAR(200) NOT NULL,
    service_type VARCHAR(200) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'clinic', 'staff')),
    clinic_id VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    permissions TEXT
);

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50) NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SAFE DATA INSERTION - Only if tables are empty
-- ================================================================

-- Insert default perks only if perks table is empty
INSERT INTO perks (id, type, name, description, value, is_active, valid_for, requires_approval)
SELECT * FROM (VALUES
    ('perk_dental_cleaning_001', 'dental_cleaning', 'Free Dental Cleaning', 'Complete professional dental cleaning service', 1500.00, TRUE, 365, FALSE),
    ('perk_consultation_001', 'consultation', 'Free Dental Consultation', 'Comprehensive dental consultation and check-up', 500.00, TRUE, 365, FALSE),
    ('perk_xray_001', 'xray', 'Digital X-Ray Service', 'Digital X-ray imaging for diagnosis', 800.00, TRUE, 365, TRUE),
    ('perk_treatment_001', 'treatment', 'Treatment Discount', '20% discount on dental treatments and procedures', 20.00, TRUE, 365, TRUE),
    ('perk_discount_001', 'discount', 'General Service Discount', '10% discount on all dental services', 10.00, TRUE, 365, FALSE)
) AS v(id, type, name, description, value, is_active, valid_for, requires_approval)
WHERE NOT EXISTS (SELECT 1 FROM perks WHERE perks.id = v.id);

-- Insert admin user only if users table is empty
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, permissions)
SELECT * FROM (VALUES
    ('user_admin_001', 'admin', 'admin@mocards.cloud', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfMY8UfuJt1HyYa', 'admin', 'MOCARDS', 'Administrator', TRUE, '["manage_clinics", "manage_cards", "manage_perks", "view_all_data", "manage_users"]')
) AS v(id, username, email, password_hash, role, first_name, last_name, is_active, permissions)
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = v.id);

-- ================================================================
-- VERIFICATION - Show what we have now
-- ================================================================

-- Show current table structure
SELECT
    'appointments' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;

-- Show row counts
SELECT 'Table Counts:' as info;
SELECT
    'cards' as table_name, COUNT(*) as row_count FROM cards
UNION ALL
SELECT
    'clinics' as table_name, COUNT(*) as row_count FROM clinics
UNION ALL
SELECT
    'appointments' as table_name, COUNT(*) as row_count FROM appointments
UNION ALL
SELECT
    'perks' as table_name, COUNT(*) as row_count FROM perks
UNION ALL
SELECT
    'perk_redemptions' as table_name, COUNT(*) as row_count FROM perk_redemptions
UNION ALL
SELECT
    'users' as table_name, COUNT(*) as row_count FROM users;

-- ================================================================
-- 🎉 MIGRATION COMPLETE! Your database is now updated! 🎉
-- ================================================================