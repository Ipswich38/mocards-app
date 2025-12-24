-- ================================================================
-- MOCARDS CLOUD - SIMPLE DATABASE FIX
-- Ultra-safe version that avoids all type issues
-- ================================================================

-- 🚨 SIMPLE FIX FOR PERKS TABLE 🚨
-- This version avoids any type casting issues

-- ================================================================
-- FIX PERKS TABLE - Add missing columns safely
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
-- SAFELY INSERT DEFAULT PERKS (only if table is empty or nearly empty)
-- ================================================================

-- Only insert perks if we have fewer than 3 perks (meaning it's likely empty)
DO $$
DECLARE
    perk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO perk_count FROM perks;

    IF perk_count < 3 THEN
        -- Table is empty or has very few perks, safe to insert defaults
        INSERT INTO perks (id, type, name, description, value, is_active, valid_for, requires_approval, created_at, updated_at)
        VALUES
            (gen_random_uuid(), 'dental_cleaning', 'Free Dental Cleaning', 'Complete professional dental cleaning service', 1500.00, TRUE, 365, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'consultation', 'Free Dental Consultation', 'Comprehensive dental consultation and check-up', 500.00, TRUE, 365, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'xray', 'Digital X-Ray Service', 'Digital X-ray imaging for diagnosis', 800.00, TRUE, 365, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'treatment', 'Treatment Discount', '20% discount on dental treatments and procedures', 20.00, TRUE, 365, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'discount', 'General Service Discount', '10% discount on all dental services', 10.00, TRUE, 365, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

        RAISE NOTICE '✅ Inserted 5 default perks into the table';
    ELSE
        RAISE NOTICE 'ℹ️ Perks table already has data (% rows), skipping default insertion', perk_count;
    END IF;
END $$;

-- ================================================================
-- VERIFY THE FIX WORKED
-- ================================================================

-- Show current perks table structure
SELECT 'PERKS TABLE STRUCTURE:' as info;

-- Show column information
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'perks'
ORDER BY ordinal_position;

-- Show the perks data (limit to 10 to avoid too much output)
SELECT 'PERKS DATA (First 10):' as info;
SELECT name, type, value, is_active, valid_for, requires_approval
FROM perks
LIMIT 10;

-- Count perks
SELECT 'PERK COUNT:' as info;
SELECT COUNT(*) as total_perks FROM perks;

-- ================================================================
-- 🎉 SIMPLE FIX COMPLETE! 🎉
-- ================================================================

SELECT '🎉 SIMPLE FIX COMPLETE! Your perks table should now work!' as success_message;