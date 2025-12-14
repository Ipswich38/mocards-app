-- =============================================================================
-- ENSURE 10,000 SEQUENTIAL MOC CARDS (00001 - 10000)
-- =============================================================================
-- This schema ensures exactly 10,000 cards exist with sequential numbering
-- Format: MOC-00001 to MOC-10000 (unassigned/unactivated)
-- Region and clinic codes are empty (to be filled during activation)

BEGIN;

-- =============================================================================
-- PRELIMINARY CHECKS AND BACKUP
-- =============================================================================

-- Check current card status
DO $$
DECLARE
    total_cards INTEGER;
    v2_formatted_cards INTEGER;
    sequential_cards INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_cards FROM public.cards;
    SELECT COUNT(*) INTO v2_formatted_cards FROM public.cards
    WHERE control_number_v2 LIKE 'MOC-%';
    SELECT COUNT(*) INTO sequential_cards FROM public.cards
    WHERE card_number BETWEEN 1 AND 10000;

    RAISE NOTICE '📊 CURRENT CARD STATUS:';
    RAISE NOTICE '   Total cards in database: %', total_cards;
    RAISE NOTICE '   V2 formatted cards (MOC-*): %', v2_formatted_cards;
    RAISE NOTICE '   Sequential numbered cards (1-10000): %', sequential_cards;
    RAISE NOTICE '==================================================';
END $$;

-- Create backup table
CREATE TABLE IF NOT EXISTS cards_backup_pre_sequential AS
SELECT * FROM public.cards;

-- =============================================================================
-- ENSURE CARD STRUCTURE
-- =============================================================================

-- Ensure cards table has all required columns
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS card_number INTEGER;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS control_number_v2 VARCHAR(255);

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS location_code_v2 VARCHAR(10);

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS clinic_code_v2 VARCHAR(20);

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'unassigned';

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS assigned_clinic_id UUID;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS migration_version INTEGER DEFAULT 2;

-- =============================================================================
-- GENERATE MISSING CARDS TO COMPLETE 10,000 SEQUENCE
-- =============================================================================

DO $$
DECLARE
    i INTEGER;
    existing_count INTEGER;
    cards_to_generate INTEGER[];
    missing_card INTEGER;
BEGIN
    -- Find missing card numbers from 1 to 10000
    RAISE NOTICE '🔍 Checking for missing cards in sequence 1-10000...';

    SELECT array_agg(generate_series)
    INTO cards_to_generate
    FROM generate_series(1, 10000)
    WHERE generate_series NOT IN (
        SELECT card_number
        FROM public.cards
        WHERE card_number IS NOT NULL
        AND card_number BETWEEN 1 AND 10000
    );

    IF cards_to_generate IS NULL OR array_length(cards_to_generate, 1) = 0 THEN
        RAISE NOTICE '✅ All 10,000 cards already exist!';
    ELSE
        RAISE NOTICE '📝 Found % missing cards. Generating...', array_length(cards_to_generate, 1);

        -- Generate missing cards
        FOREACH missing_card IN ARRAY cards_to_generate LOOP
            INSERT INTO public.cards (
                card_number,
                control_number,
                control_number_v2,
                batch_id,
                passcode,
                status,
                is_activated,
                location_code_v2,
                clinic_code_v2,
                migration_version,
                created_at,
                updated_at
            ) VALUES (
                missing_card,
                'MOC-' || LPAD(missing_card::TEXT, 5, '0'), -- Old format: MOC-00001
                'MOC-' || LPAD(missing_card::TEXT, 5, '0'), -- New format: MOC-00001 (simplified)
                NULL, -- No batch assignment
                LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0'), -- Random 6-digit passcode
                'unassigned',
                false,
                NULL, -- Empty region code (to be filled during activation)
                NULL, -- Empty clinic code (to be filled during activation)
                2,
                NOW(),
                NOW()
            );
        END LOOP;

        RAISE NOTICE '✅ Generated % missing cards', array_length(cards_to_generate, 1);
    END IF;
END $$;

-- =============================================================================
-- UPDATE EXISTING CARDS TO ENSURE PROPER FORMAT
-- =============================================================================

-- Update any existing cards that don't have proper V2 format
UPDATE public.cards
SET
    control_number_v2 = 'MOC-' || LPAD(card_number::TEXT, 5, '0'),
    control_number = COALESCE(control_number, 'MOC-' || LPAD(card_number::TEXT, 5, '0')),
    status = COALESCE(status, 'unassigned'),
    is_activated = COALESCE(is_activated, false),
    migration_version = 2,
    updated_at = NOW()
WHERE card_number BETWEEN 1 AND 10000
AND (
    control_number_v2 IS NULL
    OR control_number_v2 NOT LIKE 'MOC-_____'
    OR control_number_v2 LIKE 'MOC-XX-XX-%'
);

-- =============================================================================
-- CREATE ESSENTIAL INDEXES FOR FAST LOOKUP
-- =============================================================================

-- Index for card_number (1-10000)
CREATE INDEX IF NOT EXISTS idx_cards_card_number_sequence
ON public.cards(card_number)
WHERE card_number BETWEEN 1 AND 10000;

-- Index for 5-digit search
CREATE INDEX IF NOT EXISTS idx_cards_control_v2_suffix
ON public.cards USING btree (RIGHT(control_number_v2, 5))
WHERE control_number_v2 LIKE 'MOC-%';

-- Index for unassigned cards
CREATE INDEX IF NOT EXISTS idx_cards_unassigned_sequential
ON public.cards(card_number, status)
WHERE status = 'unassigned' AND card_number BETWEEN 1 AND 10000;

-- =============================================================================
-- VERIFICATION AND REPORTING
-- =============================================================================

-- Final verification
DO $$
DECLARE
    total_cards INTEGER;
    sequential_cards INTEGER;
    unassigned_cards INTEGER;
    missing_numbers TEXT;
    sample_cards RECORD;
BEGIN
    -- Count totals
    SELECT COUNT(*) INTO total_cards FROM public.cards;
    SELECT COUNT(*) INTO sequential_cards FROM public.cards
    WHERE card_number BETWEEN 1 AND 10000;
    SELECT COUNT(*) INTO unassigned_cards FROM public.cards
    WHERE card_number BETWEEN 1 AND 10000 AND status = 'unassigned';

    -- Check for any missing numbers
    SELECT string_agg(generate_series::TEXT, ', ') INTO missing_numbers
    FROM generate_series(1, 10000)
    WHERE generate_series NOT IN (
        SELECT card_number
        FROM public.cards
        WHERE card_number BETWEEN 1 AND 10000
    )
    LIMIT 10; -- Only show first 10 if any

    RAISE NOTICE '📊 FINAL VERIFICATION:';
    RAISE NOTICE '   Total cards in database: %', total_cards;
    RAISE NOTICE '   Sequential cards (1-10000): %', sequential_cards;
    RAISE NOTICE '   Unassigned sequential cards: %', unassigned_cards;

    IF missing_numbers IS NOT NULL THEN
        RAISE NOTICE '❌ Missing card numbers: %', missing_numbers;
    ELSE
        RAISE NOTICE '✅ ALL 10,000 SEQUENTIAL CARDS CONFIRMED!';
    END IF;

    RAISE NOTICE '==================================================';
END $$;

-- Show sample of cards
SELECT
    card_number,
    control_number,
    control_number_v2,
    status,
    is_activated,
    location_code_v2,
    clinic_code_v2,
    created_at
FROM public.cards
WHERE card_number BETWEEN 1 AND 10000
ORDER BY card_number
LIMIT 10;

RAISE NOTICE '📋 Sample shown above: First 10 cards (00001-00010)';

-- Show last 10 cards
SELECT
    card_number,
    control_number,
    control_number_v2,
    status,
    is_activated,
    location_code_v2,
    clinic_code_v2,
    created_at
FROM public.cards
WHERE card_number BETWEEN 9991 AND 10000
ORDER BY card_number;

RAISE NOTICE '📋 Sample shown above: Last 10 cards (09991-10000)';

-- =============================================================================
-- SUMMARY STATISTICS
-- =============================================================================

SELECT
    COUNT(*) as total_cards,
    COUNT(CASE WHEN card_number BETWEEN 1 AND 10000 THEN 1 END) as sequential_cards,
    COUNT(CASE WHEN status = 'unassigned' AND card_number BETWEEN 1 AND 10000 THEN 1 END) as unassigned_cards,
    COUNT(CASE WHEN status = 'assigned' AND card_number BETWEEN 1 AND 10000 THEN 1 END) as assigned_cards,
    COUNT(CASE WHEN status = 'activated' AND card_number BETWEEN 1 AND 10000 THEN 1 END) as activated_cards,
    MIN(CASE WHEN card_number BETWEEN 1 AND 10000 THEN card_number END) as min_card_number,
    MAX(CASE WHEN card_number BETWEEN 1 AND 10000 THEN card_number END) as max_card_number,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-_____' AND card_number BETWEEN 1 AND 10000 THEN 1 END) as properly_formatted
FROM public.cards;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (Run these after schema execution)
-- =============================================================================

-- 1. Verify 10,000 cards exist
-- SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000;

-- 2. Check for gaps in sequence
-- SELECT generate_series FROM generate_series(1, 10000)
-- WHERE generate_series NOT IN (SELECT card_number FROM public.cards WHERE card_number BETWEEN 1 AND 10000);

-- 3. Verify format consistency
-- SELECT card_number, control_number_v2 FROM public.cards
-- WHERE card_number BETWEEN 1 AND 10000 AND control_number_v2 NOT LIKE 'MOC-_____';

-- 4. Check unassigned cards ready for clinic assignment
-- SELECT COUNT(*) FROM public.cards
-- WHERE card_number BETWEEN 1 AND 10000 AND status = 'unassigned';