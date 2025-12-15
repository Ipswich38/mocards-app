-- =============================================================================
-- COMPREHENSIVE MOCARDS AUDIT SCRIPT
-- =============================================================================
-- This script audits the entire MOCards system to identify:
-- 1. Missing schemas and inconsistent structures
-- 2. Isolated process flows and unsyncing issues
-- 3. Dual control number problems (legacy vs current)
-- 4. Control number format issues
-- 5. Card accessibility across portals

BEGIN;

RAISE NOTICE '🔍 STARTING COMPREHENSIVE MOCARDS AUDIT';
RAISE NOTICE '=================================================================';

-- =============================================================================
-- 1. DATABASE SCHEMA AUDIT
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '📋 1. DATABASE SCHEMA STRUCTURE AUDIT';
RAISE NOTICE '-----------------------------------------------------------------';

-- Check table existence
DO $$
DECLARE
    table_info RECORD;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    expected_tables TEXT[] := ARRAY[
        'cards', 'mocards_clinics', 'card_batches', 'card_perks',
        'default_perk_templates', 'card_redemptions', 'regions',
        'clinic_assignments', 'appointments'
    ];
    table_name TEXT;
BEGIN
    RAISE NOTICE '🔍 Checking table existence...';

    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ MISSING TABLES: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All expected tables exist';
    END IF;
END $$;

-- Check cards table structure
RAISE NOTICE '';
RAISE NOTICE '🔍 Cards table column audit:';
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cards'
ORDER BY ordinal_position;

-- =============================================================================
-- 2. DUAL CONTROL NUMBER ANALYSIS
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '📋 2. DUAL CONTROL NUMBER ANALYSIS';
RAISE NOTICE '-----------------------------------------------------------------';

-- Analyze control number patterns
DO $$
DECLARE
    total_cards INTEGER;
    cards_with_legacy INTEGER;
    cards_with_v2 INTEGER;
    cards_with_both INTEGER;
    cards_with_neither INTEGER;
    inconsistent_cards INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_cards FROM public.cards;

    SELECT COUNT(*) INTO cards_with_legacy
    FROM public.cards WHERE control_number IS NOT NULL;

    SELECT COUNT(*) INTO cards_with_v2
    FROM public.cards WHERE control_number_v2 IS NOT NULL;

    SELECT COUNT(*) INTO cards_with_both
    FROM public.cards
    WHERE control_number IS NOT NULL AND control_number_v2 IS NOT NULL;

    SELECT COUNT(*) INTO cards_with_neither
    FROM public.cards
    WHERE control_number IS NULL AND control_number_v2 IS NULL;

    -- Check for inconsistent control numbers (different formats)
    SELECT COUNT(*) INTO inconsistent_cards
    FROM public.cards
    WHERE control_number IS NOT NULL
    AND control_number_v2 IS NOT NULL
    AND control_number != control_number_v2;

    RAISE NOTICE '🔍 Control Number Analysis:';
    RAISE NOTICE '   Total cards: %', total_cards;
    RAISE NOTICE '   Cards with legacy control_number: %', cards_with_legacy;
    RAISE NOTICE '   Cards with v2 control_number_v2: %', cards_with_v2;
    RAISE NOTICE '   Cards with both control numbers: %', cards_with_both;
    RAISE NOTICE '   Cards with no control number: %', cards_with_neither;
    RAISE NOTICE '   Cards with inconsistent control numbers: %', inconsistent_cards;

    IF cards_with_neither > 0 THEN
        RAISE NOTICE '❌ CRITICAL: % cards have no control number!', cards_with_neither;
    END IF;

    IF inconsistent_cards > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % cards have mismatched control numbers!', inconsistent_cards;
    END IF;
END $$;

-- Show control number format patterns
RAISE NOTICE '';
RAISE NOTICE '🔍 Control number format patterns:';
SELECT
    'Legacy (control_number)' as source,
    CASE
        WHEN control_number LIKE 'MOC-00%-%-%' THEN 'MOC-00XXX-XX-XXXXXX (Current Format)'
        WHEN control_number LIKE 'MOC-1%-%-%' THEN 'MOC-1XXXX-XX-XXXXXX (10k+ Range)'
        WHEN control_number LIKE 'MOC-_____' THEN 'MOC-NNNNN (Simple Format)'
        WHEN control_number LIKE 'MOC-%-%-%' THEN 'MOC-XX-XX-XXXXX (Template)'
        ELSE 'Other/Unknown Format'
    END as format_type,
    COUNT(*) as count,
    MIN(control_number) as sample_min,
    MAX(control_number) as sample_max
FROM public.cards
WHERE control_number IS NOT NULL
GROUP BY
    CASE
        WHEN control_number LIKE 'MOC-00%-%-%' THEN 'MOC-00XXX-XX-XXXXXX (Current Format)'
        WHEN control_number LIKE 'MOC-1%-%-%' THEN 'MOC-1XXXX-XX-XXXXXX (10k+ Range)'
        WHEN control_number LIKE 'MOC-_____' THEN 'MOC-NNNNN (Simple Format)'
        WHEN control_number LIKE 'MOC-%-%-%' THEN 'MOC-XX-XX-XXXXX (Template)'
        ELSE 'Other/Unknown Format'
    END
UNION ALL
SELECT
    'V2 (control_number_v2)' as source,
    CASE
        WHEN control_number_v2 LIKE 'MOC-00%-%-%' THEN 'MOC-00XXX-XX-XXXXXX (Current Format)'
        WHEN control_number_v2 LIKE 'MOC-1%-%-%' THEN 'MOC-1XXXX-XX-XXXXXX (10k+ Range)'
        WHEN control_number_v2 LIKE 'MOC-_____' THEN 'MOC-NNNNN (Simple Format)'
        WHEN control_number_v2 LIKE 'MOC-%-%-%' THEN 'MOC-XX-XX-XXXXX (Template)'
        ELSE 'Other/Unknown Format'
    END as format_type,
    COUNT(*) as count,
    MIN(control_number_v2) as sample_min,
    MAX(control_number_v2) as sample_max
FROM public.cards
WHERE control_number_v2 IS NOT NULL
GROUP BY
    CASE
        WHEN control_number_v2 LIKE 'MOC-00%-%-%' THEN 'MOC-00XXX-XX-XXXXXX (Current Format)'
        WHEN control_number_v2 LIKE 'MOC-1%-%-%' THEN 'MOC-1XXXX-XX-XXXXXX (10k+ Range)'
        WHEN control_number_v2 LIKE 'MOC-_____' THEN 'MOC-NNNNN (Simple Format)'
        WHEN control_number_v2 LIKE 'MOC-%-%-%' THEN 'MOC-XX-XX-XXXXX (Template)'
        ELSE 'Other/Unknown Format'
    END
ORDER BY source, count DESC;

-- =============================================================================
-- 3. CARD SEQUENCE AND UNIQUENESS AUDIT
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '📋 3. CARD SEQUENCE AND UNIQUENESS AUDIT';
RAISE NOTICE '-----------------------------------------------------------------';

-- Check 10,000 card sequence
DO $$
DECLARE
    total_sequential INTEGER;
    missing_count INTEGER;
    duplicate_count INTEGER;
    missing_numbers TEXT;
BEGIN
    -- Count cards in 1-10000 range
    SELECT COUNT(*) INTO total_sequential
    FROM public.cards
    WHERE card_number BETWEEN 1 AND 10000;

    -- Find missing numbers in sequence
    SELECT COUNT(*) INTO missing_count
    FROM generate_series(1, 10000) g
    WHERE g NOT IN (
        SELECT card_number
        FROM public.cards
        WHERE card_number BETWEEN 1 AND 10000
    );

    -- Check for duplicate card numbers
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT card_number
        FROM public.cards
        WHERE card_number IS NOT NULL
        GROUP BY card_number
        HAVING COUNT(*) > 1
    ) duplicates;

    -- Get sample of missing numbers
    SELECT string_agg(g::TEXT, ', ') INTO missing_numbers
    FROM (
        SELECT g
        FROM generate_series(1, 10000) g
        WHERE g NOT IN (
            SELECT card_number
            FROM public.cards
            WHERE card_number BETWEEN 1 AND 10000
        )
        LIMIT 20
    ) missing_sample;

    RAISE NOTICE '🔍 Card Sequence Analysis (1-10000):';
    RAISE NOTICE '   Sequential cards found: %', total_sequential;
    RAISE NOTICE '   Missing cards in sequence: %', missing_count;
    RAISE NOTICE '   Duplicate card numbers: %', duplicate_count;

    IF missing_count > 0 THEN
        RAISE NOTICE '❌ Missing card numbers (sample): %', COALESCE(missing_numbers, 'None in sample');
        RAISE NOTICE '   Total missing: % out of 10,000', missing_count;
    ELSE
        RAISE NOTICE '✅ Complete 10,000 card sequence confirmed';
    END IF;

    IF duplicate_count > 0 THEN
        RAISE NOTICE '❌ CRITICAL: % duplicate card numbers found!', duplicate_count;
    END IF;
END $$;

-- =============================================================================
-- 4. PROCESS FLOW AND SYNC ANALYSIS
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '📋 4. PROCESS FLOW AND SYNC ANALYSIS';
RAISE NOTICE '-----------------------------------------------------------------';

-- Check card status consistency
RAISE NOTICE '🔍 Card status distribution:';
SELECT
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.cards), 2) as percentage
FROM public.cards
GROUP BY status
ORDER BY count DESC;

-- Check activation consistency
RAISE NOTICE '';
RAISE NOTICE '🔍 Activation status vs is_activated flag:';
SELECT
    status,
    is_activated,
    COUNT(*) as count
FROM public.cards
GROUP BY status, is_activated
ORDER BY status, is_activated;

-- Check clinic assignment sync
RAISE NOTICE '';
RAISE NOTICE '🔍 Clinic assignment sync analysis:';
DO $$
DECLARE
    assigned_cards_count INTEGER;
    assigned_with_clinic INTEGER;
    assigned_without_clinic INTEGER;
    unassigned_with_clinic INTEGER;
BEGIN
    SELECT COUNT(*) INTO assigned_cards_count
    FROM public.cards
    WHERE status = 'assigned';

    SELECT COUNT(*) INTO assigned_with_clinic
    FROM public.cards
    WHERE status = 'assigned' AND assigned_clinic_id IS NOT NULL;

    SELECT COUNT(*) INTO assigned_without_clinic
    FROM public.cards
    WHERE status = 'assigned' AND assigned_clinic_id IS NULL;

    SELECT COUNT(*) INTO unassigned_with_clinic
    FROM public.cards
    WHERE status != 'assigned' AND assigned_clinic_id IS NOT NULL;

    RAISE NOTICE '   Total "assigned" status cards: %', assigned_cards_count;
    RAISE NOTICE '   Assigned cards with clinic_id: %', assigned_with_clinic;
    RAISE NOTICE '   Assigned cards without clinic_id: %', assigned_without_clinic;
    RAISE NOTICE '   Non-assigned cards with clinic_id: %', unassigned_with_clinic;

    IF assigned_without_clinic > 0 THEN
        RAISE NOTICE '❌ SYNC ISSUE: % assigned cards missing clinic_id', assigned_without_clinic;
    END IF;

    IF unassigned_with_clinic > 0 THEN
        RAISE NOTICE '❌ SYNC ISSUE: % non-assigned cards have clinic_id', unassigned_with_clinic;
    END IF;
END $$;

-- =============================================================================
-- 5. PORTAL ACCESSIBILITY AUDIT
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '📋 5. PORTAL ACCESSIBILITY AUDIT';
RAISE NOTICE '-----------------------------------------------------------------';

-- Check searchability across different formats
RAISE NOTICE '🔍 Card lookup/search compatibility:';
DO $$
DECLARE
    searchable_by_legacy INTEGER;
    searchable_by_v2 INTEGER;
    searchable_by_card_number INTEGER;
    unsearchable INTEGER;
BEGIN
    SELECT COUNT(*) INTO searchable_by_legacy
    FROM public.cards
    WHERE control_number IS NOT NULL
    AND control_number != '';

    SELECT COUNT(*) INTO searchable_by_v2
    FROM public.cards
    WHERE control_number_v2 IS NOT NULL
    AND control_number_v2 != '';

    SELECT COUNT(*) INTO searchable_by_card_number
    FROM public.cards
    WHERE card_number IS NOT NULL;

    SELECT COUNT(*) INTO unsearchable
    FROM public.cards
    WHERE (control_number IS NULL OR control_number = '')
    AND (control_number_v2 IS NULL OR control_number_v2 = '')
    AND card_number IS NULL;

    RAISE NOTICE '   Searchable by legacy control_number: %', searchable_by_legacy;
    RAISE NOTICE '   Searchable by v2 control_number_v2: %', searchable_by_v2;
    RAISE NOTICE '   Searchable by card_number: %', searchable_by_card_number;
    RAISE NOTICE '   Completely unsearchable cards: %', unsearchable;

    IF unsearchable > 0 THEN
        RAISE NOTICE '❌ CRITICAL: % cards are unsearchable!', unsearchable;
    END IF;
END $$;

-- =============================================================================
-- 6. RECOMMENDATIONS SUMMARY
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '📋 6. AUDIT RECOMMENDATIONS';
RAISE NOTICE '-----------------------------------------------------------------';

DO $$
DECLARE
    issues_found INTEGER := 0;
    cards_missing_v2 INTEGER;
    cards_with_old_format INTEGER;
    cards_without_proper_sequence INTEGER;
BEGIN
    -- Count various issues
    SELECT COUNT(*) INTO cards_missing_v2
    FROM public.cards
    WHERE card_number BETWEEN 1 AND 10000
    AND (control_number_v2 IS NULL OR control_number_v2 = '');

    SELECT COUNT(*) INTO cards_with_old_format
    FROM public.cards
    WHERE card_number BETWEEN 1 AND 10000
    AND control_number_v2 NOT LIKE 'MOC-%';

    SELECT COUNT(*) INTO cards_without_proper_sequence
    FROM public.cards
    WHERE card_number BETWEEN 1 AND 10000
    AND control_number_v2 NOT LIKE 'MOC-_____';

    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRIORITY FIXES NEEDED:';

    IF cards_missing_v2 > 0 THEN
        issues_found := issues_found + 1;
        RAISE NOTICE '%  Priority %. Update % cards missing control_number_v2',
                     issues_found, issues_found, cards_missing_v2;
    END IF;

    IF cards_with_old_format > 0 THEN
        issues_found := issues_found + 1;
        RAISE NOTICE '%  Priority %. Fix % cards with incorrect v2 format',
                     issues_found, issues_found, cards_with_old_format;
    END IF;

    -- Check for the new format requirement (MOC-10000-XX-XXXXXX)
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEW FORMAT REQUIREMENT:';
    RAISE NOTICE '   Current format: MOC-00001 to MOC-10000 (simple)';
    RAISE NOTICE '   Required format: MOC-10000-XX-XXXXXX (where XX=region, XXXXXX=clinic)';
    RAISE NOTICE '   ✅ Action needed: Update format to include region/clinic codes';

    IF issues_found = 0 THEN
        RAISE NOTICE '✅ No critical structural issues found!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '📊 SUMMARY: % priority issues identified', issues_found;
    END IF;
END $$;

RAISE NOTICE '';
RAISE NOTICE '=================================================================';
RAISE NOTICE '🏁 AUDIT COMPLETE';
RAISE NOTICE '=================================================================';

COMMIT;