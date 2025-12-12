-- Quick Check and Generate 10,000 Cards if Missing
-- This script safely checks for existing cards and generates them if needed

-- Check current status
SELECT
    'CURRENT CARD STATUS' as check_type,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN migration_version = 2 THEN 1 END) as v2_cards,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 1 END) as formatted_cards,
    COUNT(CASE WHEN status = 'unassigned' AND migration_version = 2 THEN 1 END) as available_for_assignment
FROM public.cards;

-- Check if we need to generate cards
DO $$
DECLARE
    v2_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v2_count
    FROM public.cards
    WHERE migration_version = 2 AND control_number_v2 LIKE 'MOC-01-NCR1-%';

    IF v2_count < 10000 THEN
        RAISE NOTICE '🚨 MISSING CARDS: Only % V2 cards found. Need to generate %', v2_count, (10000 - v2_count);
        RAISE NOTICE '💡 RUN: generate-mocards-production-ready.sql';
    ELSE
        RAISE NOTICE '✅ CARDS OK: % V2 cards found', v2_count;
    END IF;
END $$;

-- Show sample of existing cards for verification
SELECT
    'EXISTING CARDS SAMPLE' as sample_type,
    control_number_v2,
    card_number,
    status,
    is_activated,
    created_at
FROM public.cards
WHERE migration_version = 2
ORDER BY card_number
LIMIT 5;