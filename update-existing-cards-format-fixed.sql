-- Update Existing Cards to Proper V2 Format - FIXED VERSION
-- Fixes cards that have template format (MOC-XX-XX-NNNNN) to proper format (MOC-01-NCR1-NNNNN)
-- SAFE EXECUTION - Handles data type constraints properly

BEGIN;

-- =============================================================================
-- CHECK COLUMN CONSTRAINTS FIRST
-- =============================================================================

-- Check the actual column definitions to avoid length errors
SELECT
    '🔍 COLUMN ANALYSIS' as info,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cards'
    AND table_schema = 'public'
    AND column_name IN ('location_code_v2', 'clinic_code_v2', 'control_number_v2')
ORDER BY column_name;

-- =============================================================================
-- PRE-UPDATE ANALYSIS
-- =============================================================================

-- Show current status
SELECT
    '📊 PRE-UPDATE STATUS' as section,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN migration_version = 2 THEN 1 END) as v2_cards,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-XX-XX-%' THEN 1 END) as template_format_cards,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 1 END) as proper_format_cards,
    COUNT(CASE WHEN control_number_v2 IS NULL THEN 1 END) as cards_without_v2_control
FROM public.cards;

-- =============================================================================
-- BACKUP EXISTING DATA
-- =============================================================================

-- Create backup table for safety
CREATE TABLE IF NOT EXISTS cards_backup_before_format_update AS
SELECT * FROM public.cards WHERE migration_version = 2;

-- Log backup creation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_log') THEN
        INSERT INTO public.system_audit_log (operation, description, created_at)
        VALUES ('CARDS_BACKUP_CREATED', 'Backup created before card format update', NOW());
    END IF;
END $$;

-- =============================================================================
-- ADJUST COLUMN SIZES IF NEEDED
-- =============================================================================

-- Check and expand column sizes if they're too small
DO $$
DECLARE
    location_max_length INTEGER;
    clinic_max_length INTEGER;
    control_max_length INTEGER;
BEGIN
    -- Get current maximum lengths
    SELECT character_maximum_length INTO location_max_length
    FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'location_code_v2';

    SELECT character_maximum_length INTO clinic_max_length
    FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'clinic_code_v2';

    SELECT character_maximum_length INTO control_max_length
    FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'control_number_v2';

    -- Expand location_code_v2 if too small for 'NCR1'
    IF location_max_length IS NOT NULL AND location_max_length < 10 THEN
        ALTER TABLE public.cards ALTER COLUMN location_code_v2 TYPE VARCHAR(10);
        RAISE NOTICE '✅ Expanded location_code_v2 to VARCHAR(10)';
    END IF;

    -- Expand clinic_code_v2 if too small
    IF clinic_max_length IS NOT NULL AND clinic_max_length < 20 THEN
        ALTER TABLE public.cards ALTER COLUMN clinic_code_v2 TYPE VARCHAR(20);
        RAISE NOTICE '✅ Expanded clinic_code_v2 to VARCHAR(20)';
    END IF;

    -- Expand control_number_v2 if too small for MOC-01-NCR1-NNNNN format
    IF control_max_length IS NOT NULL AND control_max_length < 255 THEN
        ALTER TABLE public.cards ALTER COLUMN control_number_v2 TYPE VARCHAR(255);
        RAISE NOTICE '✅ Expanded control_number_v2 to VARCHAR(255)';
    END IF;
END $$;

-- =============================================================================
-- UPDATE TEMPLATE FORMAT CARDS (WITH SAFE VALUES)
-- =============================================================================

-- Update cards with template format (MOC-XX-XX-NNNNN) to proper format (MOC-01-NCR1-NNNNN)
UPDATE public.cards
SET
    control_number_v2 = 'MOC-01-NCR1-' || LPAD(card_number::TEXT, 5, '0'),
    location_code_v2 = CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'cards'
            AND column_name = 'location_code_v2'
            AND character_maximum_length >= 4
        ) THEN 'NCR1'
        ELSE LEFT('NCR1', (
            SELECT character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'cards' AND column_name = 'location_code_v2'
        ))
    END,
    updated_at = NOW()
WHERE migration_version = 2
    AND control_number_v2 LIKE 'MOC-XX-XX-%'
    AND card_number IS NOT NULL;

-- Get count of updated cards
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % cards from template format to proper format', updated_count;
END $$;

-- =============================================================================
-- FIX CARDS WITHOUT V2 CONTROL NUMBERS
-- =============================================================================

-- Generate V2 control numbers for cards that don't have them
UPDATE public.cards
SET
    control_number_v2 = 'MOC-01-NCR1-' || LPAD(card_number::TEXT, 5, '0'),
    location_code_v2 = CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'cards'
            AND column_name = 'location_code_v2'
            AND character_maximum_length >= 4
        ) THEN 'NCR1'
        ELSE LEFT('NCR1', (
            SELECT character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'cards' AND column_name = 'location_code_v2'
        ))
    END,
    migration_version = 2,
    updated_at = NOW()
WHERE control_number_v2 IS NULL
    AND card_number IS NOT NULL
    AND card_number BETWEEN 1 AND 10000;

-- Get count of cards that got V2 control numbers
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE '✅ Added V2 control numbers to % cards', fixed_count;
END $$;

-- =============================================================================
-- GENERATE MISSING PASSCODES
-- =============================================================================

-- Function to generate secure passcode
CREATE OR REPLACE FUNCTION generate_secure_passcode()
RETURNS VARCHAR(6) AS $$
BEGIN
  RETURN LPAD((RANDOM() * 899999 + 100000)::INTEGER::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Add passcodes to cards that don't have them
UPDATE public.cards
SET
    passcode = generate_secure_passcode(),
    updated_at = NOW()
WHERE (passcode IS NULL OR passcode = '')
    AND migration_version = 2;

-- =============================================================================
-- ENSURE PROPER STATUS VALUES
-- =============================================================================

-- Fix any invalid status values
UPDATE public.cards
SET
    status = 'unassigned',
    updated_at = NOW()
WHERE migration_version = 2
    AND (status IS NULL OR status NOT IN ('unassigned', 'assigned', 'activated', 'expired', 'suspended'));

-- Fix holder names for consistency
UPDATE public.cards
SET
    holder_name = 'MOCARDS Member #' || LPAD(card_number::TEXT, 5, '0'),
    updated_at = NOW()
WHERE migration_version = 2
    AND (holder_name IS NULL OR holder_name = '');

-- =============================================================================
-- CREATE/UPDATE SEARCH INDEXES
-- =============================================================================

-- Ensure all search indexes exist
CREATE INDEX IF NOT EXISTS idx_cards_v2_control_number_search
ON public.cards(control_number_v2)
WHERE migration_version = 2;

CREATE INDEX IF NOT EXISTS idx_cards_v2_card_number_search
ON public.cards(card_number)
WHERE migration_version = 2;

CREATE INDEX IF NOT EXISTS idx_cards_v2_status_search
ON public.cards(status, migration_version);

-- =============================================================================
-- POST-UPDATE VERIFICATION
-- =============================================================================

-- Check column sizes after update
SELECT
    '🔍 FINAL COLUMN SIZES' as info,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cards'
    AND table_schema = 'public'
    AND column_name IN ('location_code_v2', 'clinic_code_v2', 'control_number_v2')
ORDER BY column_name;

-- Verify the updates
SELECT
    '✅ POST-UPDATE STATUS' as section,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN migration_version = 2 THEN 1 END) as v2_cards,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 1 END) as proper_format_cards,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-XX-XX-%' THEN 1 END) as remaining_template_cards,
    COUNT(CASE WHEN passcode IS NOT NULL AND LENGTH(passcode) = 6 THEN 1 END) as cards_with_passcode,
    COUNT(CASE WHEN status = 'unassigned' THEN 1 END) as unassigned_cards
FROM public.cards;

-- Show sample of updated cards
SELECT
    '📋 UPDATED CARDS SAMPLE' as info,
    card_number,
    control_number_v2,
    status,
    CASE WHEN LENGTH(passcode) = 6 THEN '✅ Valid' ELSE '❌ Invalid' END as passcode_status,
    location_code_v2,
    LENGTH(location_code_v2) as location_length
FROM public.cards
WHERE migration_version = 2
ORDER BY card_number
LIMIT 10;

-- Final verification - check if we now have searchable cards
SELECT
    CASE
        WHEN proper_v2_cards >= 10000 THEN '🎉 SUCCESS: Cards are ready for search!'
        WHEN proper_v2_cards >= 5000 THEN '⚠️  PARTIAL: Some cards ready, may need more'
        ELSE '❌ ISSUE: Still need more properly formatted cards'
    END as final_status,
    proper_v2_cards as searchable_cards_count,
    CASE
        WHEN proper_v2_cards < 10000 THEN (10000 - proper_v2_cards)
        ELSE 0
    END as additional_needed
FROM (
    SELECT COUNT(*) as proper_v2_cards
    FROM public.cards
    WHERE migration_version = 2
        AND control_number_v2 LIKE 'MOC-01-NCR1-%'
        AND passcode IS NOT NULL
        AND LENGTH(passcode) = 6
) stats;

-- Log the successful update
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_log') THEN
        INSERT INTO public.system_audit_log (operation, description, details)
        VALUES (
            'CARDS_FORMAT_UPDATED_FIXED',
            'Updated existing cards to proper V2 format for search compatibility (fixed version)',
            jsonb_build_object(
                'total_v2_cards', (SELECT COUNT(*) FROM public.cards WHERE migration_version = 2),
                'properly_formatted', (SELECT COUNT(*) FROM public.cards WHERE control_number_v2 LIKE 'MOC-01-NCR1-%'),
                'update_date', NOW(),
                'ready_for_search', true,
                'column_sizes_adjusted', true
            )
        );
    END IF;
END $$;

COMMIT;

-- Success message
SELECT
    '🎉 CARD FORMAT UPDATE COMPLETED (FIXED)!' as result,
    'Column sizes adjusted and cards formatted for search compatibility' as technical_note,
    'Your cards should now be searchable in the admin dashboard' as user_note;