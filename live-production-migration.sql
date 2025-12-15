-- =============================================================================
-- LIVE PRODUCTION MIGRATION - UNIFIED CARD SYSTEM
-- =============================================================================
-- PRODUCTION DEPLOYMENT: Implements unified card system for live environment
-- 1. Eliminates dual control number confusion
-- 2. Updates format from MOC-00001 to MOC-10000-XX-XXXXXX
-- 3. Ensures all 10,000 cards remain accessible across all portals
-- 4. Maintains backward compatibility during transition
-- 5. Simplifies the card system without over-complication

-- =============================================================================
-- 1. PRODUCTION BACKUP
-- =============================================================================

-- Create production backup with timestamp
CREATE TABLE cards_backup_prod_migration AS
SELECT *, NOW() as backup_timestamp FROM public.cards WHERE TRUE;

CREATE TABLE mocards_clinics_backup_prod AS
SELECT *, NOW() as backup_timestamp FROM public.mocards_clinics WHERE TRUE;

-- =============================================================================
-- 2. ENSURE PRODUCTION SCHEMA
-- =============================================================================

-- Add new columns required for unified system
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS unified_control_number VARCHAR(255);

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS display_card_number INTEGER;

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
-- 3. PRODUCTION CARD GENERATION (10,000 SEQUENTIAL CARDS)
-- =============================================================================

DO $$
DECLARE
    missing_card INTEGER;
    region_code TEXT := '01'; -- NCR region for production
    default_clinic_code TEXT := 'CVT001'; -- Default clinic for production
BEGIN
    -- Generate production cards for numbers 1 to 10000
    FOR missing_card IN 1..10000 LOOP
        -- Only insert if card doesn't exist in production
        IF NOT EXISTS (
            SELECT 1 FROM public.cards
            WHERE card_number = missing_card
        ) THEN
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
                'MOC-' || LPAD(missing_card::TEXT, 5, '0'),
                'MOC-' || LPAD(missing_card::TEXT, 5, '0'),
                'MOC-' || LPAD((missing_card + 9999)::TEXT, 5, '0') || '-' || region_code || '-' || default_clinic_code,
                missing_card + 9999,
                LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0'),
                'unassigned',
                false,
                region_code,
                default_clinic_code,
                3,
                NOW(),
                NOW()
            );
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 4. UPDATE EXISTING PRODUCTION CARDS
-- =============================================================================

-- Update existing production cards to unified system
UPDATE public.cards
SET
    unified_control_number = CASE
        WHEN assigned_clinic_id IS NOT NULL THEN (
            SELECT 'MOC-' || LPAD((card_number + 9999)::TEXT, 5, '0') || '-01-' ||
                   COALESCE(c.clinic_code, 'CVT001')
            FROM public.mocards_clinics c
            WHERE c.id = cards.assigned_clinic_id
        )
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
-- 5. PRODUCTION PORTAL ACCESS FUNCTIONS
-- =============================================================================

-- Universal search function for production
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
        c.control_number ILIKE '%' || search_term || '%'
        OR c.control_number_v2 ILIKE '%' || search_term || '%'
        OR c.unified_control_number ILIKE '%' || search_term || '%'
        OR c.card_number::TEXT = search_term
        OR c.display_card_number::TEXT = search_term
        OR LPAD(c.card_number::TEXT, 5, '0') = search_term
        OR LPAD(c.display_card_number::TEXT, 5, '0') = search_term
    )
    ORDER BY c.card_number;
END $$;

-- ADMIN PORTAL: Full CRUD access to all 10,000 cards in production
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
END $$;

-- CLINIC PORTAL: Mirror all 10,000 cards for clinic access
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
END $$;

-- PATIENT PORTAL: Read-only card lookup for production
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
-- 6. PRODUCTION PERFORMANCE INDEXES
-- =============================================================================

-- Production indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_cards_unified_control_number_prod
ON public.cards(unified_control_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX IF NOT EXISTS idx_cards_display_number_prod
ON public.cards(display_card_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX IF NOT EXISTS idx_cards_universal_search_prod
ON public.cards(control_number, control_number_v2, unified_control_number, card_number)
WHERE card_number BETWEEN 1 AND 10000;

CREATE INDEX IF NOT EXISTS idx_cards_clinic_lookup_prod
ON public.cards(assigned_clinic_id, status)
WHERE card_number BETWEEN 1 AND 10000;

-- =============================================================================
-- 7. PRODUCTION PERK SYSTEM
-- =============================================================================

-- Ensure production perk system compatibility
ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT true;

ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS customizable BOOLEAN DEFAULT false;

ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false;

-- Production perk indexes
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id_prod ON public.card_perks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_claimed_prod ON public.card_perks(is_claimed);

-- =============================================================================
-- 8. PRODUCTION DEPLOYMENT VERIFICATION
-- =============================================================================

-- Verify production deployment
SELECT
    'PRODUCTION DEPLOYMENT COMPLETE' as status,
    (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000) as total_production_cards,
    (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000 AND unified_control_number IS NOT NULL) as cards_unified_format,
    (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000 AND display_card_number BETWEEN 10000 AND 19999) as cards_new_display_range,
    NOW() as deployment_timestamp
;

-- Production card format samples
SELECT
    'PRODUCTION CARD SAMPLES' as info,
    card_number,
    display_card_number,
    control_number as legacy_format,
    unified_control_number as production_format
FROM public.cards
WHERE card_number BETWEEN 1 AND 5
ORDER BY card_number;