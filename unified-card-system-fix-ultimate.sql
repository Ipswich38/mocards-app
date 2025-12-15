-- =============================================================================
-- UNIFIED CARD SYSTEM FIX - ULTIMATE PRODUCTION SOLUTION
-- =============================================================================
-- This script addresses all identified issues with proper type handling:
-- 1. Eliminates dual control number confusion
-- 2. Updates format from MOC-00001 to MOC-10000-XX-XXXXXX
-- 3. Ensures all 10,000 cards remain accessible across all portals
-- 4. Maintains backward compatibility during transition
-- 5. Simplifies the card system without over-complication

-- =============================================================================
-- 1. BACKUP AND SAFETY MEASURES
-- =============================================================================

-- Create comprehensive backup
CREATE TABLE IF NOT EXISTS cards_backup_unified_fix AS
SELECT * FROM public.cards WHERE TRUE;

CREATE TABLE IF NOT EXISTS mocards_clinics_backup AS
SELECT * FROM public.mocards_clinics WHERE TRUE;

-- =============================================================================
-- 2. SIMPLIFY CONTROL NUMBER SYSTEM - ELIMINATE DUAL NUMBERS
-- =============================================================================

-- First, ensure we have the new format column
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS unified_control_number VARCHAR(255);

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS display_card_number INTEGER;

-- Ensure cards table has all required columns for the new system
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
ADD COLUMN IF NOT EXISTS migration_version INTEGER DEFAULT 3;

-- =============================================================================
-- 3. ENSURE 10,000 CARDS EXIST IN SEQUENCE
-- =============================================================================

-- Generate missing cards to complete 10,000 sequence
DO $$
DECLARE
    i INTEGER;
    existing_count INTEGER;
    cards_to_generate INTEGER[];
    missing_card INTEGER;
    region_code TEXT := '01'; -- NCR region
    default_clinic_code TEXT := 'CVT001'; -- Default clinic
BEGIN
    -- Find missing card numbers from 1 to 10000
    SELECT array_agg(generate_series)
    INTO cards_to_generate
    FROM generate_series(1, 10000)
    WHERE generate_series NOT IN (
        SELECT card_number
        FROM public.cards
        WHERE card_number IS NOT NULL
        AND card_number BETWEEN 1 AND 10000
    );

    IF cards_to_generate IS NOT NULL AND array_length(cards_to_generate, 1) > 0 THEN
        -- Generate missing cards
        FOREACH missing_card IN ARRAY cards_to_generate LOOP
            INSERT INTO public.cards (
                card_number,
                control_number,
                control_number_v2,
                unified_control_number,
                display_card_number,
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
                'MOC-' || LPAD(missing_card::TEXT, 5, '0'), -- Legacy format: MOC-00001
                'MOC-' || LPAD(missing_card::TEXT, 5, '0'), -- Simple format: MOC-00001
                'MOC-' || LPAD((missing_card + 9999)::TEXT, 5, '0') || '-' || region_code || '-' || default_clinic_code, -- New unified: MOC-10000-01-CVT001
                missing_card + 9999, -- Display number: 1→10000, 2→10001, etc.
                LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0'), -- Random 6-digit passcode
                'unassigned',
                false,
                region_code, -- Region code
                default_clinic_code, -- Default clinic code
                3, -- Migration version 3 (unified system)
                NOW(),
                NOW()
            );
        END LOOP;
    END IF;
END $$;

-- =============================================================================
-- 4. UPDATE EXISTING CARDS TO UNIFIED SYSTEM
-- =============================================================================

-- Update existing cards with the new unified format
UPDATE public.cards
SET
    unified_control_number = CASE
        -- For assigned cards, use their clinic's code
        WHEN assigned_clinic_id IS NOT NULL THEN (
            SELECT 'MOC-' || LPAD((card_number + 9999)::TEXT, 5, '0') || '-01-' ||
                   COALESCE(c.clinic_code, 'CVT001')
            FROM public.mocards_clinics c
            WHERE c.id = cards.assigned_clinic_id
        )
        -- For unassigned cards, use default format
        ELSE 'MOC-' || LPAD((card_number + 9999)::TEXT, 5, '0') || '-01-CVT001'
    END,
    display_card_number = COALESCE(display_card_number, card_number + 9999),
    control_number = COALESCE(control_number, 'MOC-' || LPAD(card_number::TEXT, 5, '0')),
    control_number_v2 = COALESCE(control_number_v2, 'MOC-' || LPAD(card_number::TEXT, 5, '0')),
    location_code_v2 = COALESCE(location_code_v2, '01'),
    clinic_code_v2 = COALESCE(clinic_code_v2, 'CVT001'),
    status = COALESCE(status, 'unassigned'),
    is_activated = COALESCE(is_activated, false),
    migration_version = 3,
    updated_at = NOW()
WHERE card_number BETWEEN 1 AND 10000
AND (
    unified_control_number IS NULL
    OR migration_version < 3
);

-- =============================================================================
-- 5. CREATE PORTAL ACCESS FUNCTIONS (DYNAMIC TYPE HANDLING)
-- =============================================================================

-- Universal search function that works across ALL portals
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
        ARRAY[c.control_number::TEXT, c.control_number_v2::TEXT, c.unified_control_number::TEXT] as all_control_numbers,
        COALESCE(c.passcode::TEXT, '') as passcode,
        COALESCE(c.status::TEXT, 'unassigned') as status,
        COALESCE(c.is_activated, false) as is_activated,
        c.assigned_clinic_id,
        COALESCE(cl.clinic_name::TEXT, '') as clinic_name
    FROM public.cards c
    LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
    WHERE c.card_number BETWEEN 1 AND 10000
    AND (
        -- Search by any control number format
        c.control_number ILIKE '%' || search_term || '%'
        OR c.control_number_v2 ILIKE '%' || search_term || '%'
        OR c.unified_control_number ILIKE '%' || search_term || '%'
        -- Search by card numbers (both internal and display)
        OR c.card_number::TEXT = search_term
        OR c.display_card_number::TEXT = search_term
        -- Search by padded formats
        OR LPAD(c.card_number::TEXT, 5, '0') = search_term
        OR LPAD(c.display_card_number::TEXT, 5, '0') = search_term
        -- Search by just the number part (00001-10000)
        OR RIGHT(c.control_number, 5) = LPAD(search_term, 5, '0')
        OR RIGHT(c.unified_control_number, 5) = LPAD(search_term, 5, '0')
        -- Handle MOC prefix searches
        OR UPPER(search_term) LIKE 'MOC%' AND (
            c.control_number ILIKE search_term
            OR c.control_number_v2 ILIKE search_term
            OR c.unified_control_number ILIKE search_term
        )
    )
    ORDER BY c.card_number;
END $$;

-- Admin Portal Function: Full CRUD access to all 10,000 cards
CREATE OR REPLACE FUNCTION admin_get_all_cards()
RETURNS TABLE(
    id UUID,
    card_number INTEGER,
    display_card_number INTEGER,
    unified_control_number TEXT,
    control_number TEXT,
    control_number_v2 TEXT,
    status TEXT,
    is_activated BOOLEAN,
    assigned_clinic_id UUID,
    clinic_name TEXT,
    location_code_v2 TEXT,
    clinic_code_v2 TEXT,
    created_at TEXT,
    updated_at TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.card_number,
        c.display_card_number,
        COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
        COALESCE(c.control_number::TEXT, '') as control_number,
        COALESCE(c.control_number_v2::TEXT, '') as control_number_v2,
        COALESCE(c.status::TEXT, 'unassigned') as status,
        COALESCE(c.is_activated, false) as is_activated,
        c.assigned_clinic_id,
        COALESCE(cl.clinic_name::TEXT, '') as clinic_name,
        COALESCE(c.location_code_v2::TEXT, '') as location_code_v2,
        COALESCE(c.clinic_code_v2::TEXT, '') as clinic_code_v2,
        COALESCE(c.created_at::TEXT, NOW()::TEXT) as created_at,
        COALESCE(c.updated_at::TEXT, NOW()::TEXT) as updated_at
    FROM public.cards c
    LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
    WHERE c.card_number BETWEEN 1 AND 10000
    ORDER BY c.card_number;
END $$;

-- Clinic Portal Function: Mirror all 10,000 cards with complete details
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
    can_activate BOOLEAN,
    location_code_v2 TEXT,
    clinic_code_v2 TEXT
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
        -- Clinic can activate if card is assigned to them and not yet activated
        CASE
            WHEN c.assigned_clinic_id IS NOT NULL AND COALESCE(c.is_activated, false) = false
            THEN true
            ELSE false
        END as can_activate,
        COALESCE(c.location_code_v2::TEXT, '') as location_code_v2,
        COALESCE(c.clinic_code_v2::TEXT, '') as clinic_code_v2
    FROM public.cards c
    LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
    WHERE c.card_number BETWEEN 1 AND 10000
    ORDER BY c.card_number;
END $$;

-- Patient Portal Function: Read-only lookup for all 10,000 cards
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
        -- Patient can search by any format: 00001, 10000, MOC-00001, MOC-10000-01-CVT001
        c.card_number::TEXT = search_term
        OR c.display_card_number::TEXT = search_term
        OR LPAD(c.card_number::TEXT, 5, '0') = search_term
        OR c.control_number ILIKE search_term
        OR c.control_number_v2 ILIKE search_term
        OR c.unified_control_number ILIKE search_term
    )
    LIMIT 1;
END $$;

-- =============================================================================
-- 6. CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Indexes for fast searching across all portals
CREATE INDEX IF NOT EXISTS idx_cards_unified_control_number
ON public.cards(unified_control_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX IF NOT EXISTS idx_cards_display_number
ON public.cards(display_card_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX IF NOT EXISTS idx_cards_universal_search
ON public.cards(control_number, control_number_v2, unified_control_number, card_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX IF NOT EXISTS idx_cards_clinic_lookup
ON public.cards(assigned_clinic_id, unified_control_number, status)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX IF NOT EXISTS idx_cards_patient_lookup
ON public.cards(card_number, display_card_number, status)
WHERE card_number BETWEEN 1 AND 10000;

-- =============================================================================
-- 7. ENSURE CLINIC AND PERK SCHEMA COMPATIBILITY
-- =============================================================================

-- Ensure default_perk_templates table exists with required columns (from clinic schema)
ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT true;

ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS customizable BOOLEAN DEFAULT false;

ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS max_redemptions INTEGER;

ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS valid_for_days INTEGER;

-- Insert default perk templates if they don't exist
INSERT INTO public.default_perk_templates (perk_name, perk_type, perk_value, description, is_active, is_default)
SELECT * FROM (VALUES
  ('Dental Consultation', 'consultation', 500.00, 'Free dental consultation and checkup', true, true),
  ('Dental Cleaning', 'cleaning', 800.00, 'Professional dental cleaning service', true, true),
  ('Tooth Extraction', 'extraction', 1500.00, 'Tooth extraction service', true, true),
  ('Fluoride Treatment', 'fluoride', 300.00, 'Fluoride treatment for cavity prevention', true, true),
  ('Teeth Whitening', 'whitening', 2500.00, 'Professional teeth whitening service', true, true),
  ('Dental X-Ray', 'xray', 1000.00, 'Dental X-ray imaging', true, true),
  ('Denture Service', 'denture', 3000.00, 'Denture fitting and service', true, true),
  ('Braces Discount', 'braces', 5000.00, 'Discount on braces treatment', true, true)
) AS v(perk_name, perk_type, perk_value, description, is_active, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_perk_templates
  WHERE perk_type = v.perk_type AND is_default = true
);

-- Ensure card_perks table has proper columns
ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS perk_template_id UUID REFERENCES public.default_perk_templates(id);

ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;

ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false;

-- Create additional indexes for perk management
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id ON public.card_perks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_claimed ON public.card_perks(is_claimed);

-- =============================================================================
-- 8. FINAL VERIFICATION (SAFE VERSION)
-- =============================================================================

-- Simple verification without function calls that might fail
SELECT
    'MIGRATION STATUS' as check_type,
    (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000) as total_cards,
    (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000 AND unified_control_number IS NOT NULL) as cards_with_unified_format,
    CASE
        WHEN (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000) = 10000
        THEN 'SUCCESS'
        ELSE 'INCOMPLETE'
    END as card_generation_status
;

-- Test basic functionality
SELECT 'BASIC SEARCH TEST' as test_type, COUNT(*) as results
FROM public.cards
WHERE card_number BETWEEN 1 AND 10000
AND (
    control_number LIKE '%00001%'
    OR control_number_v2 LIKE '%00001%'
    OR unified_control_number LIKE '%10000%'
);

-- Test portal functions only if they exist
DO $$
BEGIN
    -- Test admin function
    BEGIN
        PERFORM COUNT(*) FROM admin_get_all_cards();
        INSERT INTO public.cards (card_number) VALUES (-100) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.cards (card_number) VALUES (-101) ON CONFLICT DO NOTHING;
    END;

    -- Test clinic function
    BEGIN
        PERFORM COUNT(*) FROM clinic_get_all_cards_mirror();
        INSERT INTO public.cards (card_number) VALUES (-102) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.cards (card_number) VALUES (-103) ON CONFLICT DO NOTHING;
    END;

    -- Test patient function
    BEGIN
        PERFORM COUNT(*) FROM patient_lookup_card('00001');
        INSERT INTO public.cards (card_number) VALUES (-104) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.cards (card_number) VALUES (-105) ON CONFLICT DO NOTHING;
    END;
END $$;

-- Show function test results
SELECT
    'FUNCTION TEST RESULTS' as test_type,
    CASE WHEN EXISTS(SELECT 1 FROM public.cards WHERE card_number = -100) THEN 'ADMIN: OK' ELSE 'ADMIN: ERROR' END as admin_status,
    CASE WHEN EXISTS(SELECT 1 FROM public.cards WHERE card_number = -102) THEN 'CLINIC: OK' ELSE 'CLINIC: ERROR' END as clinic_status,
    CASE WHEN EXISTS(SELECT 1 FROM public.cards WHERE card_number = -104) THEN 'PATIENT: OK' ELSE 'PATIENT: ERROR' END as patient_status;

-- Clean up test entries
DELETE FROM public.cards WHERE card_number < 0;