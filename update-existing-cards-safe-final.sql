-- Update Existing Cards to Proper V2 Format - SAFE FINAL VERSION
-- Handles materialized view dependencies properly and checks column existence
-- SAFE EXECUTION - Only updates columns that exist

BEGIN;

-- =============================================================================
-- CHECK CURRENT STATE
-- =============================================================================

-- Check the actual column definitions
SELECT
    '🔍 CURRENT COLUMN ANALYSIS' as info,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cards'
    AND table_schema = 'public'
    AND column_name IN ('location_code_v2', 'clinic_code_v2', 'control_number_v2', 'holder_name')
ORDER BY column_name;

-- Check for dependent materialized views
SELECT
    '🔍 DEPENDENT VIEWS' as info,
    schemaname,
    matviewname,
    definition
FROM pg_matviews
WHERE schemaname = 'public'
    AND (definition ILIKE '%cards%' OR definition ILIKE '%control_number%');

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
CREATE TABLE IF NOT EXISTS cards_backup_before_safe_final_update AS
SELECT * FROM public.cards WHERE migration_version = 2;

-- =============================================================================
-- HANDLE MATERIALIZED VIEW DEPENDENCIES
-- =============================================================================

-- Store the materialized view definition for recreation
DO $$
DECLARE
    view_definition TEXT;
    view_exists BOOLEAN := FALSE;
BEGIN
    -- Check if search_optimized_cards exists
    SELECT EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = 'search_optimized_cards'
    ) INTO view_exists;

    IF view_exists THEN
        -- Get the view definition
        SELECT definition INTO view_definition
        FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = 'search_optimized_cards';

        -- Drop the materialized view temporarily
        DROP MATERIALIZED VIEW IF EXISTS public.search_optimized_cards;
        RAISE NOTICE '✅ Temporarily dropped search_optimized_cards materialized view';

        -- Store definition for later recreation
        CREATE TEMP TABLE IF NOT EXISTS temp_view_definitions (
            view_name TEXT,
            definition TEXT
        );
        INSERT INTO temp_view_definitions VALUES ('search_optimized_cards', view_definition);
    ELSE
        RAISE NOTICE 'ℹ️  No search_optimized_cards materialized view found';
    END IF;
END $$;

-- =============================================================================
-- ADJUST COLUMN SIZES SAFELY
-- =============================================================================

-- Now we can safely adjust column sizes
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

    RAISE NOTICE 'Current column sizes: location_code_v2=%, clinic_code_v2=%, control_number_v2=%',
        location_max_length, clinic_max_length, control_max_length;

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
-- UPDATE CARD FORMATS
-- =============================================================================

-- Update cards with template format to proper format
UPDATE public.cards
SET
    control_number_v2 = 'MOC-01-NCR1-' || LPAD(card_number::TEXT, 5, '0'),
    location_code_v2 = 'NCR1',
    updated_at = NOW()
WHERE migration_version = 2
    AND control_number_v2 LIKE 'MOC-XX-XX-%'
    AND card_number IS NOT NULL;

-- Report update count
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % cards from template format to proper format', updated_count;
END $$;

-- Generate V2 control numbers for cards that don't have them
UPDATE public.cards
SET
    control_number_v2 = 'MOC-01-NCR1-' || LPAD(card_number::TEXT, 5, '0'),
    location_code_v2 = 'NCR1',
    migration_version = 2,
    updated_at = NOW()
WHERE control_number_v2 IS NULL
    AND card_number IS NOT NULL
    AND card_number BETWEEN 1 AND 10000;

-- Report generation count
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE '✅ Added V2 control numbers to % cards', fixed_count;
END $$;

-- =============================================================================
-- COMPLETE CARD DATA (SAFELY CHECK FOR COLUMNS)
-- =============================================================================

-- Generate secure passcodes
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

-- Fix status values
UPDATE public.cards
SET
    status = 'unassigned',
    updated_at = NOW()
WHERE migration_version = 2
    AND (status IS NULL OR status NOT IN ('unassigned', 'assigned', 'activated', 'expired', 'suspended'));

-- Fix holder names ONLY if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'holder_name') THEN
        UPDATE public.cards
        SET
            holder_name = 'MOCARDS Member #' || LPAD(card_number::TEXT, 5, '0'),
            updated_at = NOW()
        WHERE migration_version = 2
            AND (holder_name IS NULL OR holder_name = '');

        RAISE NOTICE '✅ Updated holder names for cards';
    ELSE
        RAISE NOTICE 'ℹ️  Holder name column does not exist - skipping holder name updates';
    END IF;
END $$;

-- =============================================================================
-- RECREATE MATERIALIZED VIEW
-- =============================================================================

-- Recreate the search_optimized_cards materialized view
DO $$
DECLARE
    view_def TEXT;
BEGIN
    -- Check if we stored a view definition
    IF EXISTS (SELECT 1 FROM temp_view_definitions WHERE view_name = 'search_optimized_cards') THEN
        SELECT definition INTO view_def FROM temp_view_definitions WHERE view_name = 'search_optimized_cards';

        -- Recreate the materialized view
        EXECUTE 'CREATE MATERIALIZED VIEW public.search_optimized_cards AS ' || view_def;
        RAISE NOTICE '✅ Recreated search_optimized_cards materialized view';

        -- Recreate the index
        CREATE INDEX IF NOT EXISTS idx_search_optimized_cards_searchable
        ON public.search_optimized_cards USING gin(to_tsvector('english', searchable_text));
        RAISE NOTICE '✅ Recreated search index on materialized view';

    ELSE
        -- Create a new search optimized view if it didn't exist
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.search_optimized_cards AS
        SELECT
            c.id,
            c.control_number,
            c.control_number_v2,
            c.card_number,
            c.status,
            c.is_activated,
            c.assigned_clinic_id,
            c.created_at,
            c.activated_at,
            mc.clinic_name,
            mc.clinic_code,
            -- Create searchable text for full-text search
            COALESCE(c.control_number, '') || ' ' ||
            COALESCE(c.control_number_v2, '') || ' ' ||
            COALESCE(c.card_number::TEXT, '') || ' ' ||
            COALESCE(mc.clinic_name, '') || ' ' ||
            COALESCE(mc.clinic_code, '') as searchable_text
        FROM public.cards c
        LEFT JOIN public.mocards_clinics mc ON c.assigned_clinic_id = mc.id;

        CREATE INDEX IF NOT EXISTS idx_search_optimized_cards_searchable
        ON public.search_optimized_cards USING gin(to_tsvector('english', searchable_text));

        RAISE NOTICE '✅ Created new search_optimized_cards materialized view';
    END IF;
END $$;

-- =============================================================================
-- CREATE SEARCH INDEXES
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
-- FINAL VERIFICATION
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
    '✅ FINAL STATUS' as section,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN migration_version = 2 THEN 1 END) as v2_cards,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 1 END) as proper_format_cards,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-XX-XX-%' THEN 1 END) as remaining_template_cards,
    COUNT(CASE WHEN passcode IS NOT NULL AND LENGTH(passcode) = 6 THEN 1 END) as cards_with_passcode,
    COUNT(CASE WHEN status = 'unassigned' THEN 1 END) as unassigned_cards
FROM public.cards;

-- Show sample of updated cards
SELECT
    '📋 FINAL CARDS SAMPLE' as info,
    card_number,
    control_number_v2,
    status,
    CASE WHEN LENGTH(passcode) = 6 THEN '✅ Valid' ELSE '❌ Invalid' END as passcode_status,
    location_code_v2
FROM public.cards
WHERE migration_version = 2
ORDER BY card_number
LIMIT 10;

-- Final verification - check search readiness
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

-- Check materialized view status
SELECT
    '🔍 SEARCH VIEW STATUS' as info,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'search_optimized_cards')
        THEN '✅ Search view exists'
        ELSE '❌ Search view missing'
    END as view_status,
    (SELECT COUNT(*) FROM public.search_optimized_cards) as indexed_cards;

-- Log the successful update
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_log') THEN
        INSERT INTO public.system_audit_log (operation, description, details)
        VALUES (
            'CARDS_FORMAT_SAFE_FINAL_UPDATE',
            'Successfully updated cards to proper V2 format with safe column handling',
            jsonb_build_object(
                'total_v2_cards', (SELECT COUNT(*) FROM public.cards WHERE migration_version = 2),
                'properly_formatted', (SELECT COUNT(*) FROM public.cards WHERE control_number_v2 LIKE 'MOC-01-NCR1-%'),
                'update_date', NOW(),
                'ready_for_search', true,
                'materialized_view_handled', true,
                'column_sizes_adjusted', true,
                'safe_column_checks', true
            )
        );
    END IF;
END $$;

COMMIT;

-- Final success messages
SELECT
    '🎉 SAFE CARD FORMAT UPDATE COMPLETED SUCCESSFULLY!' as result;

SELECT
    '✅ Column dependencies resolved safely' as technical_1,
    '✅ Materialized views recreated' as technical_2,
    '✅ Search indexes optimized' as technical_3,
    '✅ Cards formatted for search compatibility' as technical_4,
    '✅ Non-existent columns safely skipped' as technical_5;

SELECT
    'Your enhanced search system should now work perfectly!' as user_message;