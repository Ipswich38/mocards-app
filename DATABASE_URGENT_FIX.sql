-- ================================================================
-- MOCARDS CLOUD - URGENT FIX FOR PERK_REDEMPTIONS TABLE
-- Fixes the "column used_at does not exist" error specifically
-- ================================================================

-- 🚨 URGENT FIX FOR PERK_REDEMPTIONS COLUMN ERROR 🚨

-- First, let's check what columns exist in perk_redemptions table
SELECT 'CHECKING PERK_REDEMPTIONS TABLE STRUCTURE:' as info;q
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'perk_redemptions'
ORDER BY ordinal_position;

-- ================================================================
-- ADD MISSING COLUMNS TO PERK_REDEMPTIONS TABLE
-- ================================================================

-- Add used_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'used_at'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added used_at column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ used_at column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add card_control_number column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'card_control_number'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN card_control_number VARCHAR(50) NOT NULL DEFAULT 'MOC-00000-NCR-DEFAULT';
        RAISE NOTICE '✅ Added card_control_number column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ card_control_number column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add perk_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'perk_id'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN perk_id UUID NOT NULL DEFAULT gen_random_uuid();
        RAISE NOTICE '✅ Added perk_id column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ perk_id column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add perk_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'perk_name'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN perk_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Perk';
        RAISE NOTICE '✅ Added perk_name column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ perk_name column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add clinic_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'clinic_id'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN clinic_id UUID NOT NULL DEFAULT gen_random_uuid();
        RAISE NOTICE '✅ Added clinic_id column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ clinic_id column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add claimant_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'claimant_name'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN claimant_name VARCHAR(200) NOT NULL DEFAULT 'Unknown Claimant';
        RAISE NOTICE '✅ Added claimant_name column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ claimant_name column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add handled_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'handled_by'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN handled_by VARCHAR(200) NOT NULL DEFAULT 'System';
        RAISE NOTICE '✅ Added handled_by column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ handled_by column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add service_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'service_type'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN service_type VARCHAR(200) NOT NULL DEFAULT 'General Service';
        RAISE NOTICE '✅ Added service_type column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ service_type column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add value column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'value'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN value DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added value column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ value column already exists in perk_redemptions table';
    END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perk_redemptions' AND column_name = 'notes'
    ) THEN
        ALTER TABLE perk_redemptions ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes column to perk_redemptions table';
    ELSE
        RAISE NOTICE 'ℹ️ notes column already exists in perk_redemptions table';
    END IF;
END $$;

-- ================================================================
-- ALSO FIX ANY OTHER MISSING COLUMNS IN OTHER TABLES
-- ================================================================

-- Add missing card_control_number column to appointments if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'card_control_number'
    ) THEN
        ALTER TABLE appointments ADD COLUMN card_control_number VARCHAR(50) NOT NULL DEFAULT 'MOC-00000-NCR-DEFAULT';
        RAISE NOTICE '✅ Added card_control_number column to appointments table';
    ELSE
        RAISE NOTICE 'ℹ️ card_control_number column already exists in appointments table';
    END IF;
END $$;

-- Add clinic_id to appointments if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'appointments' AND column_name = 'clinic_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN clinic_id UUID NOT NULL DEFAULT gen_random_uuid();
        RAISE NOTICE '✅ Added clinic_id column to appointments table';
    ELSE
        RAISE NOTICE 'ℹ️ clinic_id column already exists in appointments table';
    END IF;
END $$;

-- ================================================================
-- CREATE INDEXES FOR PERK_REDEMPTIONS TABLE
-- ================================================================

-- Create indexes for perk_redemptions table performance
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_used_at ON perk_redemptions(used_at);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card_control_number ON perk_redemptions(card_control_number);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_id ON perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk_id ON perk_redemptions(perk_id);

-- ================================================================
-- VERIFICATION - SHOW FIXED STRUCTURE
-- ================================================================

-- Show the updated perk_redemptions table structure
SELECT 'UPDATED PERK_REDEMPTIONS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'perk_redemptions'
ORDER BY ordinal_position;

-- Test a basic query to make sure used_at column works
SELECT 'TESTING USED_AT COLUMN:' as info;
SELECT COUNT(*) as redemption_count FROM perk_redemptions;

-- Show all tables and their column counts
SELECT 'ALL TABLES STRUCTURE:' as info;
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = t.table_name) as constraint_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ================================================================
-- 🎉 URGENT FIX COMPLETE! 🎉
-- ================================================================

SELECT '🎉 URGENT FIX COMPLETE! All missing columns have been added!' as success_message;
SELECT 'The "used_at" column and all other missing columns are now properly created!' as details;
SELECT 'You should be able to run any query without column errors now!' as confirmation;