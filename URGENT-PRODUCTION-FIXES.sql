-- =============================================================================
-- URGENT PRODUCTION FIXES - CRITICAL ISSUES
-- =============================================================================
-- Fixes critical issues found in comprehensive audit:
-- 1. Portal functions only returning 1,000 cards instead of 10,000
-- 2. Search functionality missing for legacy and unified formats
-- 3. Perk system validation issues

-- =============================================================================
-- FIX 1: PORTAL FUNCTIONS RETURNING ALL 10,000 CARDS
-- =============================================================================

-- Fix admin portal function (remove implicit LIMIT)
CREATE OR REPLACE FUNCTION admin_get_all_cards()
RETURNS TABLE(
    id UUID,
    card_number INTEGER,
    display_card_number INTEGER,
    unified_control_number TEXT,
    control_number TEXT,
    status TEXT,
    is_activated BOOLEAN,
    assigned_clinic_id UUID,
    clinic_name TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.card_number,
        c.display_card_number,
        COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
        COALESCE(c.control_number::TEXT, '') as control_number,
        COALESCE(c.status::TEXT, 'unassigned') as status,
        COALESCE(c.is_activated, false) as is_activated,
        c.assigned_clinic_id,
        COALESCE(cl.clinic_name::TEXT, '') as clinic_name
    FROM public.cards c
    LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
    WHERE c.card_number BETWEEN 1 AND 10000
    ORDER BY c.card_number;
    -- NO LIMIT - Return all 10,000 cards
END $$;

-- Fix clinic portal function (remove implicit LIMIT)
CREATE OR REPLACE FUNCTION clinic_get_all_cards_mirror()
RETURNS TABLE(
    id UUID,
    card_number INTEGER,
    display_card_number INTEGER,
    unified_control_number TEXT,
    control_number TEXT,
    status TEXT,
    is_activated BOOLEAN,
    assigned_clinic_id UUID,
    assigned_clinic_name TEXT,
    can_activate BOOLEAN
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.card_number,
        c.display_card_number,
        COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
        COALESCE(c.control_number::TEXT, '') as control_number,
        COALESCE(c.status::TEXT, 'unassigned') as status,
        COALESCE(c.is_activated, false) as is_activated,
        c.assigned_clinic_id,
        COALESCE(cl.clinic_name::TEXT, '') as assigned_clinic_name,
        CASE
            WHEN c.assigned_clinic_id IS NOT NULL AND COALESCE(c.is_activated, false) = false
            THEN true
            ELSE false
        END as can_activate
    FROM public.cards c
    LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
    WHERE c.card_number BETWEEN 1 AND 10000
    ORDER BY c.card_number;
    -- NO LIMIT - Return all 10,000 cards
END $$;

-- =============================================================================
-- FIX 2: ENHANCED SEARCH FUNCTIONALITY
-- =============================================================================

-- Fix universal search to handle all formats properly
CREATE OR REPLACE FUNCTION search_card_universal(search_term TEXT)
RETURNS TABLE(
    id UUID,
    card_number INTEGER,
    display_card_number INTEGER,
    primary_control_number TEXT,
    all_control_numbers TEXT[],
    passcode TEXT,
    status TEXT,
    is_activated BOOLEAN,
    assigned_clinic_id UUID,
    clinic_name TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.card_number,
        c.display_card_number,
        COALESCE(c.unified_control_number::TEXT, c.control_number_v2::TEXT, c.control_number::TEXT) as primary_control_number,
        ARRAY[
            COALESCE(c.control_number::TEXT, ''),
            COALESCE(c.control_number_v2::TEXT, ''),
            COALESCE(c.unified_control_number::TEXT, '')
        ] as all_control_numbers,
        COALESCE(c.passcode::TEXT, '') as passcode,
        COALESCE(c.status::TEXT, 'unassigned') as status,
        COALESCE(c.is_activated, false) as is_activated,
        c.assigned_clinic_id,
        COALESCE(cl.clinic_name::TEXT, '') as clinic_name
    FROM public.cards c
    LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
    WHERE c.card_number BETWEEN 1 AND 10000
    AND (
        -- Enhanced search patterns to handle all formats
        c.control_number = search_term
        OR c.control_number_v2 = search_term
        OR c.unified_control_number = search_term
        OR c.control_number ILIKE '%' || search_term || '%'
        OR c.control_number_v2 ILIKE '%' || search_term || '%'
        OR c.unified_control_number ILIKE '%' || search_term || '%'
        OR c.card_number::TEXT = search_term
        OR c.display_card_number::TEXT = search_term
        OR LPAD(c.card_number::TEXT, 5, '0') = search_term
        OR LPAD(c.display_card_number::TEXT, 5, '0') = search_term
        OR RIGHT(COALESCE(c.control_number, ''), 5) = LPAD(search_term, 5, '0')
        OR RIGHT(COALESCE(c.unified_control_number, ''), 5) = LPAD(search_term, 5, '0')
        -- Handle MOC prefix searches specifically
        OR (UPPER(search_term) LIKE 'MOC%' AND (
            c.control_number = search_term
            OR c.control_number_v2 = search_term
            OR c.unified_control_number = search_term
        ))
    )
    ORDER BY c.card_number;
END $$;

-- Enhanced patient lookup with better format handling
CREATE OR REPLACE FUNCTION patient_lookup_card(search_term TEXT)
RETURNS TABLE(
    card_number INTEGER,
    display_card_number INTEGER,
    control_number TEXT,
    unified_control_number TEXT,
    status TEXT,
    is_activated BOOLEAN,
    assigned_clinic_name TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.card_number,
        c.display_card_number,
        COALESCE(c.control_number::TEXT, '') as control_number,
        COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
        COALESCE(c.status::TEXT, 'unassigned') as status,
        COALESCE(c.is_activated, false) as is_activated,
        COALESCE(cl.clinic_name::TEXT, '') as assigned_clinic_name
    FROM public.cards c
    LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
    WHERE c.card_number BETWEEN 1 AND 10000
    AND (
        -- Enhanced patient search patterns
        c.card_number::TEXT = search_term
        OR c.display_card_number::TEXT = search_term
        OR LPAD(c.card_number::TEXT, 5, '0') = search_term
        OR c.control_number = search_term
        OR c.control_number_v2 = search_term
        OR c.unified_control_number = search_term
        OR c.control_number ILIKE search_term
        OR c.control_number_v2 ILIKE search_term
        OR c.unified_control_number ILIKE search_term
        -- Handle padded searches
        OR RIGHT(COALESCE(c.control_number, ''), 5) = LPAD(search_term, 5, '0')
        OR RIGHT(COALESCE(c.unified_control_number, ''), 5) = LPAD(search_term, 5, '0')
    )
    ORDER BY c.card_number
    LIMIT 1;
END $$;

-- =============================================================================
-- FIX 3: PERK SYSTEM VALIDATION
-- =============================================================================

-- Update perk constraint to include all valid types
ALTER TABLE public.card_perks
DROP CONSTRAINT IF EXISTS card_perks_perk_type_check;

ALTER TABLE public.card_perks
ADD CONSTRAINT card_perks_perk_type_check
CHECK (perk_type IN (
    -- Dental services
    'consultation', 'cleaning', 'extraction', 'fluoride', 'whitening',
    'xray', 'denture', 'braces', 'filling', 'root_canal', 'crown',
    'bridge', 'implant', 'orthodontics', 'periodontal', 'oral_surgery',
    'emergency',
    -- General medical
    'medical_consultation', 'health_checkup', 'vaccination', 'laboratory',
    'medicine_discount',
    -- Vision care
    'eye_checkup', 'glasses_discount', 'contact_lens',
    -- Wellness
    'wellness_package', 'nutrition_counseling', 'health_screening',
    -- Additional types found in audit
    'discount', 'cashback', 'points', 'voucher', 'credit', 'freebie',
    'custom', 'special', 'premium', 'basic', 'standard'
));

-- Update existing invalid perk types to valid ones
UPDATE public.default_perk_templates
SET perk_type = 'discount'
WHERE perk_type NOT IN (
    'consultation', 'cleaning', 'extraction', 'fluoride', 'whitening',
    'xray', 'denture', 'braces', 'filling', 'root_canal', 'crown',
    'bridge', 'implant', 'orthodontics', 'periodontal', 'oral_surgery',
    'emergency', 'medical_consultation', 'health_checkup', 'vaccination',
    'laboratory', 'medicine_discount', 'eye_checkup', 'glasses_discount',
    'contact_lens', 'wellness_package', 'nutrition_counseling',
    'health_screening', 'discount', 'cashback', 'points', 'voucher',
    'credit', 'freebie', 'custom', 'special', 'premium', 'basic', 'standard'
)
AND perk_type IS NOT NULL;

-- =============================================================================
-- FIX 4: ENSURE ALL CARDS HAVE PROPER INDEXES
-- =============================================================================

-- Rebuild critical indexes for production performance
DROP INDEX IF EXISTS idx_cards_unified_control_number_prod;
DROP INDEX IF EXISTS idx_cards_display_number_prod;
DROP INDEX IF EXISTS idx_cards_universal_search_prod;

-- Create comprehensive search indexes
CREATE INDEX idx_cards_control_search_prod
ON public.cards(control_number, control_number_v2, unified_control_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX idx_cards_number_search_prod
ON public.cards(card_number, display_card_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX idx_cards_status_clinic_prod
ON public.cards(status, assigned_clinic_id, is_activated)
WHERE card_number BETWEEN 1 AND 10000;

-- Create text search indexes for pattern matching
CREATE INDEX idx_cards_control_text_prod
ON public.cards USING GIN(to_tsvector('english', COALESCE(control_number, '') || ' ' || COALESCE(control_number_v2, '') || ' ' || COALESCE(unified_control_number, '')))
WHERE card_number BETWEEN 1 AND 10000;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test portal functions return correct counts
SELECT 'ADMIN PORTAL TEST' as test, COUNT(*) as card_count FROM admin_get_all_cards();
SELECT 'CLINIC PORTAL TEST' as test, COUNT(*) as card_count FROM clinic_get_all_cards_mirror();

-- Test search functionality
SELECT 'SEARCH TEST: 00001' as test, COUNT(*) as results FROM search_card_universal('00001');
SELECT 'SEARCH TEST: MOC-00001' as test, COUNT(*) as results FROM search_card_universal('MOC-00001');
SELECT 'SEARCH TEST: 10000' as test, COUNT(*) as results FROM search_card_universal('10000');

-- Test patient lookup
SELECT 'PATIENT TEST: 00001' as test, COUNT(*) as results FROM patient_lookup_card('00001');
SELECT 'PATIENT TEST: MOC-00001' as test, COUNT(*) as results FROM patient_lookup_card('MOC-00001');

-- Show final card count verification
SELECT
    'PRODUCTION VERIFICATION' as status,
    (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000) as total_cards,
    (SELECT COUNT(*) FROM admin_get_all_cards()) as admin_accessible,
    (SELECT COUNT(*) FROM clinic_get_all_cards_mirror()) as clinic_accessible,
    NOW() as verification_timestamp;