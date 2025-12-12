-- Generate 10,000 Production-Ready MOC Cards V2.0
-- Creates searchable cards for the enhanced search system
-- SAFE EXECUTION - Checks existing data before generation

BEGIN;

-- =============================================================================
-- PRE-GENERATION VERIFICATION
-- =============================================================================

-- Check current card count
DO $$
DECLARE
    existing_cards INTEGER;
    v2_cards INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_cards FROM public.cards;
    SELECT COUNT(*) INTO v2_cards FROM public.cards WHERE migration_version = 2;

    RAISE NOTICE '📊 Current Status:';
    RAISE NOTICE '   Total cards: %', existing_cards;
    RAISE NOTICE '   V2 cards: %', v2_cards;

    IF v2_cards >= 10000 THEN
        RAISE NOTICE '✅ 10,000+ V2 cards already exist. Skipping generation.';
        RAISE EXCEPTION 'Cards already exist - use UPDATE script if needed';
    END IF;
END $$;

-- =============================================================================
-- CARD GENERATION FUNCTIONS
-- =============================================================================

-- Enhanced passcode generator (6-digit secure)
CREATE OR REPLACE FUNCTION generate_secure_passcode()
RETURNS VARCHAR(6) AS $$
BEGIN
  RETURN LPAD((RANDOM() * 899999 + 100000)::INTEGER::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate control number V2 with proper format
CREATE OR REPLACE FUNCTION generate_control_number_v2(card_num INTEGER)
RETURNS VARCHAR(255) AS $$
BEGIN
  -- Format: MOC-01-NCR1-NNNNN (following the existing pattern)
  RETURN 'MOC-01-NCR1-' || LPAD(card_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MAIN CARD GENERATION
-- =============================================================================

-- Clear any incomplete V2 cards first
DELETE FROM public.cards
WHERE migration_version = 2 AND (control_number_v2 IS NULL OR control_number_v2 = '');

-- Generate 10,000 production-ready cards
INSERT INTO public.cards (
  passcode,
  control_number_v2,
  card_number,
  location_code_v2,
  clinic_code_v2,
  is_activated,
  status,
  migration_version,
  holder_name,
  phone_number,
  email,
  assigned_clinic_id,
  assigned_at,
  activated_at,
  expires_at,
  created_at,
  updated_at
)
SELECT
  generate_secure_passcode() as passcode,
  generate_control_number_v2(series.card_num) as control_number_v2,
  series.card_num as card_number,
  'NCR1' as location_code_v2,  -- Default NCR region
  NULL as clinic_code_v2,      -- Will be set during clinic assignment
  false as is_activated,
  'unassigned' as status,      -- Available for assignment
  2 as migration_version,
  'MOCARDS Member #' || LPAD(series.card_num::TEXT, 5, '0') as holder_name,
  NULL as phone_number,        -- Will be set during activation
  NULL as email,               -- Will be set during activation
  NULL as assigned_clinic_id,  -- Will be set during clinic assignment
  NULL as assigned_at,         -- Will be set during clinic assignment
  NULL as activated_at,        -- Will be set during activation
  NULL as expires_at,          -- Will be set during activation (1 year from activation)
  NOW() as created_at,
  NOW() as updated_at
FROM generate_series(1, 10000) as series(card_num);

-- =============================================================================
-- POST-GENERATION VERIFICATION
-- =============================================================================

-- Verify successful generation
DO $$
DECLARE
    total_cards INTEGER;
    v2_cards INTEGER;
    unassigned_cards INTEGER;
    sample_control VARCHAR(255);
BEGIN
    SELECT COUNT(*) INTO total_cards FROM public.cards;
    SELECT COUNT(*) INTO v2_cards FROM public.cards WHERE migration_version = 2;
    SELECT COUNT(*) INTO unassigned_cards FROM public.cards WHERE status = 'unassigned' AND migration_version = 2;
    SELECT control_number_v2 INTO sample_control FROM public.cards WHERE migration_version = 2 LIMIT 1;

    RAISE NOTICE '✅ GENERATION COMPLETED:';
    RAISE NOTICE '   Total cards in database: %', total_cards;
    RAISE NOTICE '   V2 cards generated: %', v2_cards;
    RAISE NOTICE '   Unassigned cards ready: %', unassigned_cards;
    RAISE NOTICE '   Sample control number: %', sample_control;

    IF v2_cards < 10000 THEN
        RAISE EXCEPTION 'Generation incomplete - only % cards created', v2_cards;
    END IF;
END $$;

-- Create additional indexes for search performance
CREATE INDEX IF NOT EXISTS idx_cards_v2_control_number
ON public.cards(control_number_v2)
WHERE migration_version = 2;

CREATE INDEX IF NOT EXISTS idx_cards_v2_card_number
ON public.cards(card_number)
WHERE migration_version = 2;

CREATE INDEX IF NOT EXISTS idx_cards_v2_status
ON public.cards(status)
WHERE migration_version = 2;

CREATE INDEX IF NOT EXISTS idx_cards_v2_location
ON public.cards(location_code_v2)
WHERE migration_version = 2 AND location_code_v2 IS NOT NULL;

-- =============================================================================
-- SEARCH OPTIMIZATION SETUP
-- =============================================================================

-- Refresh search optimization view if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'search_optimized_cards') THEN
        REFRESH MATERIALIZED VIEW public.search_optimized_cards;
        RAISE NOTICE '🔍 Search optimization view refreshed';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '📝 Note: Run enhanced-search-schema-update.sql to enable search optimization';
END $$;

-- =============================================================================
-- SAMPLE DATA DISPLAY
-- =============================================================================

-- Display sample of generated cards for verification
SELECT
    '📋 SAMPLE GENERATED CARDS (First 10)' as info,
    NULL as control_number_v2,
    NULL as card_number,
    NULL as status,
    NULL as passcode,
    NULL as location_code_v2
UNION ALL
SELECT
    '---' as info,
    control_number_v2,
    card_number::TEXT,
    status,
    passcode,
    location_code_v2
FROM public.cards
WHERE migration_version = 2
ORDER BY info DESC, card_number ASC
LIMIT 11;

-- Summary statistics
SELECT
    'PRODUCTION SUMMARY' as section,
    COUNT(*) as total_v2_cards,
    COUNT(CASE WHEN status = 'unassigned' THEN 1 END) as unassigned_ready,
    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_to_clinics,
    COUNT(CASE WHEN is_activated = true THEN 1 END) as activated_cards,
    MIN(card_number) as first_card_number,
    MAX(card_number) as last_card_number
FROM public.cards
WHERE migration_version = 2;

-- Log successful generation
INSERT INTO public.system_audit_log (operation, description, details)
VALUES (
    'MOCARDS_V2_GENERATED',
    '10,000 production-ready MOC cards generated successfully',
    jsonb_build_object(
        'total_cards', (SELECT COUNT(*) FROM public.cards WHERE migration_version = 2),
        'control_format', 'MOC-01-NCR1-NNNNN',
        'location_code', 'NCR1',
        'initial_status', 'unassigned',
        'generation_date', NOW(),
        'ready_for_assignment', true,
        'ready_for_search', true
    )
);

COMMIT;

-- Final success message
SELECT
    '🎉 SUCCESS: 10,000 MOC cards generated and ready!' as result,
    'Cards are now searchable in the admin dashboard' as note,
    'Use clinic assignment to distribute cards to clinics' as next_step;