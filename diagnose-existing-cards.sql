-- Diagnose Existing Card Status
-- Check what cards currently exist and their searchability

-- Current card overview
SELECT
    '📊 CURRENT CARD OVERVIEW' as section,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN migration_version = 2 THEN 1 END) as v2_cards,
    COUNT(CASE WHEN control_number_v2 IS NOT NULL THEN 1 END) as cards_with_v2_control,
    COUNT(CASE WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 1 END) as properly_formatted_cards,
    COUNT(CASE WHEN status = 'unassigned' THEN 1 END) as unassigned_cards,
    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_cards,
    COUNT(CASE WHEN is_activated = true THEN 1 END) as activated_cards
FROM public.cards;

-- Check control number formats
SELECT
    '🔍 CONTROL NUMBER ANALYSIS' as section,
    CASE
        WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 'Proper V2 Format (MOC-01-NCR1-NNNNN)'
        WHEN control_number_v2 LIKE 'MOC-XX-XX-%' THEN 'Template Format (MOC-XX-XX-NNNNN)'
        WHEN control_number_v2 IS NOT NULL THEN 'Other V2 Format'
        WHEN control_number IS NOT NULL THEN 'Legacy Format'
        ELSE 'No Control Number'
    END as format_type,
    COUNT(*) as count,
    MIN(card_number) as min_card_num,
    MAX(card_number) as max_card_num
FROM public.cards
GROUP BY
    CASE
        WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 'Proper V2 Format (MOC-01-NCR1-NNNNN)'
        WHEN control_number_v2 LIKE 'MOC-XX-XX-%' THEN 'Template Format (MOC-XX-XX-NNNNN)'
        WHEN control_number_v2 IS NOT NULL THEN 'Other V2 Format'
        WHEN control_number IS NOT NULL THEN 'Legacy Format'
        ELSE 'No Control Number'
    END
ORDER BY count DESC;

-- Sample of existing cards for inspection
SELECT
    '📋 SAMPLE EXISTING CARDS (First 10)' as info,
    NULL as card_number,
    NULL as control_number_v2,
    NULL as status,
    NULL as migration_version,
    NULL as location_code_v2
UNION ALL
SELECT
    '---' as info,
    card_number::TEXT,
    COALESCE(control_number_v2, control_number, 'NO CONTROL NUMBER'),
    status,
    migration_version::TEXT,
    COALESCE(location_code_v2, 'NO LOCATION')
FROM public.cards
ORDER BY info DESC, card_number ASC
LIMIT 11;

-- Check for searchable cards (cards that will work with our search system)
SELECT
    '🔍 SEARCHABILITY STATUS' as section,
    COUNT(CASE WHEN control_number_v2 IS NOT NULL OR control_number IS NOT NULL THEN 1 END) as searchable_by_control,
    COUNT(CASE WHEN card_number IS NOT NULL THEN 1 END) as searchable_by_number,
    COUNT(CASE WHEN assigned_clinic_id IS NOT NULL THEN 1 END) as with_clinic_assignment,
    COUNT(CASE WHEN (control_number_v2 IS NULL AND control_number IS NULL) THEN 1 END) as unsearchable_cards
FROM public.cards;

-- Check if we need to update existing cards to proper format
SELECT
    '⚠️  CARDS NEEDING FORMAT UPDATE' as issue,
    COUNT(*) as cards_to_fix
FROM public.cards
WHERE migration_version = 2
AND (control_number_v2 IS NULL OR control_number_v2 LIKE 'MOC-XX-XX-%');

-- Determine what action to take
SELECT
    CASE
        WHEN v2_properly_formatted >= 10000 THEN '✅ CARDS ARE READY - No action needed'
        WHEN total_v2_cards >= 10000 AND v2_properly_formatted < 10000 THEN '🔧 NEED FORMAT UPDATE - Update existing cards'
        WHEN total_v2_cards < 10000 THEN '➕ NEED MORE CARDS - Generate additional cards'
        ELSE '🔍 NEED INVESTIGATION'
    END as recommended_action,
    total_v2_cards,
    v2_properly_formatted,
    (10000 - total_v2_cards) as cards_needed
FROM (
    SELECT
        COUNT(CASE WHEN migration_version = 2 THEN 1 END) as total_v2_cards,
        COUNT(CASE WHEN control_number_v2 LIKE 'MOC-01-NCR1-%' THEN 1 END) as v2_properly_formatted
    FROM public.cards
) stats;