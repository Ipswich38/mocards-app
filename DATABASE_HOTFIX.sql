-- ================================================================
-- MOCARDS CLOUD - EMERGENCY HOTFIX
-- Fixes the "column valid_for does not exist" error
-- Run this RIGHT NOW to fix the perks table
-- ================================================================

-- 🚨 EMERGENCY FIX FOR PERKS TABLE 🚨
-- This will add the missing columns that are causing the error

-- ================================================================
-- FIX PERKS TABLE - Add missing columns
-- ================================================================

-- Add valid_for column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perks' AND column_name = 'valid_for'
    ) THEN
        ALTER TABLE perks ADD COLUMN valid_for INTEGER DEFAULT 365;
        RAISE NOTICE '✅ Added valid_for column to perks table';
    ELSE
        RAISE NOTICE 'ℹ️ valid_for column already exists in perks table';
    END IF;
END $$;

-- Add requires_approval column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perks' AND column_name = 'requires_approval'
    ) THEN
        ALTER TABLE perks ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added requires_approval column to perks table';
    ELSE
        RAISE NOTICE 'ℹ️ requires_approval column already exists in perks table';
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perks' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE perks ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE '✅ Added is_active column to perks table';
    ELSE
        RAISE NOTICE 'ℹ️ is_active column already exists in perks table';
    END IF;
END $$;

-- Add description column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perks' AND column_name = 'description'
    ) THEN
        ALTER TABLE perks ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column to perks table';
    ELSE
        RAISE NOTICE 'ℹ️ description column already exists in perks table';
    END IF;
END $$;

-- Add value column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perks' AND column_name = 'value'
    ) THEN
        ALTER TABLE perks ADD COLUMN value DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added value column to perks table';
    ELSE
        RAISE NOTICE 'ℹ️ value column already exists in perks table';
    END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perks' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE perks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added created_at column to perks table';
    ELSE
        RAISE NOTICE 'ℹ️ created_at column already exists in perks table';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perks' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE perks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updated_at column to perks table';
    ELSE
        RAISE NOTICE 'ℹ️ updated_at column already exists in perks table';
    END IF;
END $$;

-- ================================================================
-- NOW SAFELY INSERT DEFAULT PERKS
-- ================================================================

-- Clear any existing default perks first (to avoid duplicates)
DELETE FROM perks WHERE id LIKE 'perk_%_001';

-- Insert the default perks with all required columns
INSERT INTO perks (id, type, name, description, value, is_active, valid_for, requires_approval, created_at, updated_at)
VALUES
    ('perk_dental_cleaning_001', 'dental_cleaning', 'Free Dental Cleaning', 'Complete professional dental cleaning service', 1500.00, TRUE, 365, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('perk_consultation_001', 'consultation', 'Free Dental Consultation', 'Comprehensive dental consultation and check-up', 500.00, TRUE, 365, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('perk_xray_001', 'xray', 'Digital X-Ray Service', 'Digital X-ray imaging for diagnosis', 800.00, TRUE, 365, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('perk_treatment_001', 'treatment', 'Treatment Discount', '20% discount on dental treatments and procedures', 20.00, TRUE, 365, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('perk_discount_001', 'discount', 'General Service Discount', '10% discount on all dental services', 10.00, TRUE, 365, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ================================================================
-- VERIFY THE FIX WORKED
-- ================================================================

-- Show current perks table structure
SELECT 'PERKS TABLE STRUCTURE:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'perks'
ORDER BY ordinal_position;

-- Show the perks data
SELECT 'PERKS DATA:' as info;
SELECT id, name, type, value, is_active, valid_for, requires_approval FROM perks;

-- Count all tables
SELECT 'TABLE COUNTS:' as info;
SELECT
    'perks' as table_name, COUNT(*) as row_count FROM perks
UNION ALL
SELECT
    'cards' as table_name, COUNT(*) as row_count FROM cards
UNION ALL
SELECT
    'clinics' as table_name, COUNT(*) as row_count FROM clinics
UNION ALL
SELECT
    'appointments' as table_name, COUNT(*) as row_count FROM appointments;

-- ================================================================
-- 🎉 HOTFIX COMPLETE! The error should be gone now! 🎉
-- ================================================================

SELECT '🎉 HOTFIX COMPLETE! Your perks table is now properly structured!' as success_message;