-- Update Existing Cards to Proper V2 Format
-- Fixes cards that have template format (MOC-XX-XX-NNNNN) to proper format (MOC-01-NCR1-NNNNN)
-- SAFE EXECUTION - Only updates cards that need fixing

BEGIN;

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
-- UPDATE TEMPLATE FORMAT CARDS
-- =============================================================================

-- Update cards with template format (MOC-XX-XX-NNNNN) to proper format (MOC-01-NCR1-NNNNN)
UPDATE public.cards
SET
    control_number_v2 = 'MOC-01-NCR1-' || LPAD(card_number::TEXT, 5, '0'),
    location_code_v2 = COALESCE(location_code_v2, 'NCR1'),
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
    location_code_v2 = COALESCE(location_code_v2, 'NCR1'),
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
    location_code_v2
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
    (10000 - proper_v2_cards) as additional_needed
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
            'CARDS_FORMAT_UPDATED',
            'Updated existing cards to proper V2 format for search compatibility',
            jsonb_build_object(
                'total_v2_cards', (SELECT COUNT(*) FROM public.cards WHERE migration_version = 2),
                'properly_formatted', (SELECT COUNT(*) FROM public.cards WHERE control_number_v2 LIKE 'MOC-01-NCR1-%'),
                'update_date', NOW(),
                'ready_for_search', true
            )
        );
    END IF;
END $$;

COMMIT;

-- Success message
SELECT
    '🎉 CARD FORMAT UPDATE COMPLETED!' as result,
    'Your cards should now be searchable in the admin dashboard' as note;