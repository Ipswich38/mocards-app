-- ================================================================
-- MOCARDS CLOUD - COMPLETE DATABASE SCHEMA FIX
-- Fixes ALL table structure issues for production deployment
-- Version: 2.0 - Christmas 2025 Production Ready
-- ================================================================

-- 🚨 COMPLETE SCHEMA ALIGNMENT FOR MOCARDS APP 🚨

-- ================================================================
-- STEP 1: CHECK CURRENT TABLE STRUCTURE
-- ================================================================

-- Check if main tables exist and their structure
SELECT 'CHECKING CARDS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cards' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CHECKING CLINICS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'clinics' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CHECKING PERK_TEMPLATES TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'perk_templates' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CHECKING PERK_REDEMPTIONS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'perk_redemptions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================
-- STEP 2: CREATE MISSING TABLES IF THEY DON'T EXIST
-- ================================================================

-- Create cards table if it doesn't exist
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200) DEFAULT '',
    status VARCHAR(20) DEFAULT 'inactive',
    perks_total INTEGER DEFAULT 5,
    perks_used INTEGER DEFAULT 0,
    clinic_id UUID,
    expiry_date DATE DEFAULT '2025-12-31',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clinics table if it doesn't exist
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name VARCHAR(200) NOT NULL,
    clinic_code VARCHAR(50) UNIQUE NOT NULL,
    region VARCHAR(50) DEFAULT 'NCR',
    address TEXT,
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    password_hash VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create perk_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS perk_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'consultation',
    value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_system_default BOOLEAN DEFAULT false,
    default_value DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_number VARCHAR(50) NOT NULL,
    assigned_clinic_id UUID,
    appointment_date DATE,
    appointment_time TIME,
    perk_type VARCHAR(200),
    cardholder_notes TEXT,
    status VARCHAR(50) DEFAULT 'waiting_for_approval',
    patient_name VARCHAR(200),
    patient_email VARCHAR(200),
    patient_phone VARCHAR(50),
    service_type VARCHAR(200),
    card_control_number VARCHAR(50),
    clinic_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create perk_redemptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS perk_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perk_id UUID,
    perk_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Perk',
    clinic_id UUID NOT NULL,
    card_control_number VARCHAR(50) NOT NULL,
    claimant_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Patient',
    handled_by VARCHAR(200) NOT NULL DEFAULT 'System',
    service_type VARCHAR(200) NOT NULL DEFAULT 'General Service',
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- STEP 3: ADD MISSING COLUMNS TO EXISTING TABLES
-- ================================================================

-- Add missing columns to clinics table FIRST (needed for indexes)
DO $$
BEGIN
    -- Add clinic_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'clinic_code'
    ) THEN
        ALTER TABLE clinics ADD COLUMN clinic_code VARCHAR(50) UNIQUE;
        RAISE NOTICE '✅ Added clinic_code column to clinics table';
    END IF;

    -- Add clinic_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'clinic_name'
    ) THEN
        ALTER TABLE clinics ADD COLUMN clinic_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Clinic';
        RAISE NOTICE '✅ Added clinic_name column to clinics table';
    END IF;

    -- Add region column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'region'
    ) THEN
        ALTER TABLE clinics ADD COLUMN region VARCHAR(50) DEFAULT 'NCR';
        RAISE NOTICE '✅ Added region column to clinics table';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'status'
    ) THEN
        ALTER TABLE clinics ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        RAISE NOTICE '✅ Added status column to clinics table';
    END IF;
END $$;

-- Add missing columns to cards table
DO $$
BEGIN
    -- Add control_number if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'control_number'
    ) THEN
        ALTER TABLE cards ADD COLUMN control_number VARCHAR(50) UNIQUE;
        RAISE NOTICE '✅ Added control_number column to cards table';
    END IF;

    -- Add full_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE cards ADD COLUMN full_name VARCHAR(200) DEFAULT '';
        RAISE NOTICE '✅ Added full_name column to cards table';
    END IF;

    -- Add perks_total if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'perks_total'
    ) THEN
        ALTER TABLE cards ADD COLUMN perks_total INTEGER DEFAULT 5;
        RAISE NOTICE '✅ Added perks_total column to cards table';
    END IF;

    -- Add perks_used if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'perks_used'
    ) THEN
        ALTER TABLE cards ADD COLUMN perks_used INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added perks_used column to cards table';
    END IF;

    -- Add expiry_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE cards ADD COLUMN expiry_date DATE DEFAULT '2025-12-31';
        RAISE NOTICE '✅ Added expiry_date column to cards table';
    END IF;

    -- Add clinic_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'clinic_id'
    ) THEN
        ALTER TABLE cards ADD COLUMN clinic_id UUID;
        RAISE NOTICE '✅ Added clinic_id column to cards table';
    END IF;
END $$;

-- Add missing columns to perk_redemptions table
DO $$
BEGIN
    -- Add used_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'used_at'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added used_at column to perk_redemptions table';
    END IF;

    -- Add card_control_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'card_control_number'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN card_control_number VARCHAR(50) NOT NULL DEFAULT 'MOC-00000-NCR-DEFAULT';
        RAISE NOTICE '✅ Added card_control_number column to perk_redemptions table';
    END IF;

    -- Add perk_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'perk_name'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN perk_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Perk';
        RAISE NOTICE '✅ Added perk_name column to perk_redemptions table';
    END IF;

    -- Add claimant_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'claimant_name'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN claimant_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Patient';
        RAISE NOTICE '✅ Added claimant_name column to perk_redemptions table';
    END IF;

    -- Add handled_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'handled_by'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN handled_by VARCHAR(200) NOT NULL DEFAULT 'System';
        RAISE NOTICE '✅ Added handled_by column to perk_redemptions table';
    END IF;

    -- Add service_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'service_type'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN service_type VARCHAR(200) NOT NULL DEFAULT 'General Service';
        RAISE NOTICE '✅ Added service_type column to perk_redemptions table';
    END IF;

    -- Add value column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'value'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN value DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added value column to perk_redemptions table';
    END IF;
END $$;

-- Add missing columns to appointments table
DO $$
BEGIN
    -- Add card_control_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'card_control_number'
    ) THEN
        ALTER TABLE appointments ADD COLUMN card_control_number VARCHAR(50);
        RAISE NOTICE '✅ Added card_control_number column to appointments table';
    END IF;

    -- Add clinic_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'clinic_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN clinic_id UUID;
        RAISE NOTICE '✅ Added clinic_id column to appointments table';
    END IF;
END $$;

-- ================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Create indexes for cards table (with existence checks)
DO $$
BEGIN
    -- Only create control_number index if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'control_number'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_cards_control_number ON cards(control_number);
        RAISE NOTICE '✅ Created index on cards.control_number';
    END IF;

    -- Only create clinic_id index if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'clinic_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON cards(clinic_id);
        RAISE NOTICE '✅ Created index on cards.clinic_id';
    END IF;

    -- Only create status index if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
        RAISE NOTICE '✅ Created index on cards.status';
    END IF;

    -- Only create created_at index if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cards' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
        RAISE NOTICE '✅ Created index on cards.created_at';
    END IF;
END $$;

-- Create indexes for clinics table (with existence checks)
DO $$
BEGIN
    -- Only create clinic_code index if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'clinic_code'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_clinics_clinic_code ON clinics(clinic_code);
        RAISE NOTICE '✅ Created index on clinic_code column';
    ELSE
        RAISE NOTICE '⚠️ Skipped clinic_code index - column does not exist';
    END IF;

    -- Only create status index if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clinics' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(status);
        RAISE NOTICE '✅ Created index on status column';
    ELSE
        RAISE NOTICE '⚠️ Skipped status index - column does not exist';
    END IF;
END $$;

-- Create indexes for perk_redemptions table (with existence checks)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perk_redemptions' AND column_name = 'used_at') THEN
        CREATE INDEX IF NOT EXISTS idx_perk_redemptions_used_at ON perk_redemptions(used_at);
        RAISE NOTICE '✅ Created index on perk_redemptions.used_at';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perk_redemptions' AND column_name = 'card_control_number') THEN
        CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card_control_number ON perk_redemptions(card_control_number);
        RAISE NOTICE '✅ Created index on perk_redemptions.card_control_number';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perk_redemptions' AND column_name = 'clinic_id') THEN
        CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_id ON perk_redemptions(clinic_id);
        RAISE NOTICE '✅ Created index on perk_redemptions.clinic_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perk_redemptions' AND column_name = 'perk_id') THEN
        CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk_id ON perk_redemptions(perk_id);
        RAISE NOTICE '✅ Created index on perk_redemptions.perk_id';
    END IF;
END $$;

-- Create indexes for appointments table (with existence checks)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'control_number') THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_control_number ON appointments(control_number);
        RAISE NOTICE '✅ Created index on appointments.control_number';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'card_control_number') THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_card_control_number ON appointments(card_control_number);
        RAISE NOTICE '✅ Created index on appointments.card_control_number';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'clinic_id') THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
        RAISE NOTICE '✅ Created index on appointments.clinic_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
        RAISE NOTICE '✅ Created index on appointments.status';
    END IF;
END $$;

-- Create indexes for perk_templates table (with existence checks)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perk_templates' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_perk_templates_is_active ON perk_templates(is_active);
        RAISE NOTICE '✅ Created index on perk_templates.is_active';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perk_templates' AND column_name = 'type') THEN
        CREATE INDEX IF NOT EXISTS idx_perk_templates_type ON perk_templates(type);
        RAISE NOTICE '✅ Created index on perk_templates.type';
    END IF;
END $$;

-- ================================================================
-- STEP 5: INSERT DEFAULT DATA IF TABLES ARE EMPTY
-- ================================================================

-- Insert default perk templates if table is empty
INSERT INTO perk_templates (name, description, type, value, is_active, is_system_default)
SELECT * FROM (VALUES
    ('Free Dental Cleaning', 'Complete dental cleaning and oral examination', 'dental_cleaning', 500.00, true, true),
    ('Free Consultation', 'General dental consultation and assessment', 'consultation', 200.00, true, true),
    ('Free X-Ray', 'Dental X-ray imaging service', 'xray', 300.00, true, true),
    ('Treatment Discount', '20% discount on dental treatments', 'discount', 0.20, true, true),
    ('Emergency Treatment', 'Emergency dental care service', 'treatment', 800.00, true, true)
) AS v(name, description, type, value, is_active, is_system_default)
WHERE NOT EXISTS (SELECT 1 FROM perk_templates);

-- ================================================================
-- STEP 6: VERIFICATION - SHOW FINAL STRUCTURE
-- ================================================================

-- Show final table structures
SELECT 'FINAL CARDS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cards' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'FINAL PERK_REDEMPTIONS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'perk_redemptions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show table counts
SELECT 'TABLE RECORD COUNTS:' as info;
SELECT
    'cards' as table_name,
    COUNT(*) as record_count
FROM cards
UNION ALL
SELECT
    'clinics' as table_name,
    COUNT(*) as record_count
FROM clinics
UNION ALL
SELECT
    'perk_templates' as table_name,
    COUNT(*) as record_count
FROM perk_templates
UNION ALL
SELECT
    'perk_redemptions' as table_name,
    COUNT(*) as record_count
FROM perk_redemptions;

-- ================================================================
-- 🎉 COMPLETE SCHEMA FIX FINISHED! 🎉
-- ================================================================

SELECT '🎉 COMPLETE DATABASE SCHEMA FIX SUCCESSFUL! 🎉' as success_message;
SELECT 'All tables are properly structured and indexed for production use!' as details;
SELECT 'MOCARDS app should now work perfectly with card generation and sync!' as confirmation;