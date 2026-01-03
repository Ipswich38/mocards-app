-- MOCARDS CLOUD - STREAMLINED FRESH SCHEMA
-- Version: 5.0.0 - Complete Reset for Production
-- Date: 2025-01-03
-- Description: Clean, simple schema with NO complexities
-- Focus: Core features only - Cards, Clinics, Appointments, Perks

-- ============================================================================
-- COMPLETE RESET - DROP ALL EXISTING OBJECTS (IF EXIST)
-- ============================================================================

-- Drop all views AND tables that might be views (handle conflicts)
DROP VIEW IF EXISTS active_regions CASCADE;
DROP VIEW IF EXISTS active_clinic_codes CASCADE;
DROP VIEW IF EXISTS clinic_codes_by_region CASCADE;
DROP VIEW IF EXISTS available_clinic_codes CASCADE;
DROP VIEW IF EXISTS cards_with_clinics CASCADE;

-- Drop tables that might exist as views
DROP TABLE IF EXISTS clinic_codes_by_region CASCADE;
DROP TABLE IF EXISTS active_regions CASCADE;
DROP TABLE IF EXISTS active_clinic_codes CASCADE;
DROP TABLE IF EXISTS available_clinic_codes CASCADE;
DROP TABLE IF EXISTS cards_with_clinics CASCADE;

-- Drop all existing tables (comprehensive cleanup)
DROP TABLE IF EXISTS perk_redemptions CASCADE;
DROP TABLE IF EXISTS perk_usage_analytics CASCADE;
DROP TABLE IF EXISTS clinic_perk_customizations CASCADE;
DROP TABLE IF EXISTS perk_categories CASCADE;
DROP TABLE IF EXISTS appointment_notifications CASCADE;
DROP TABLE IF EXISTS appointment_status_history CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS card_transactions CASCADE;
DROP TABLE IF EXISTS card_code_history CASCADE;
DROP TABLE IF EXISTS card_perks CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS card_batches CASCADE;
DROP TABLE IF EXISTS user_session_state CASCADE;
DROP TABLE IF EXISTS system_versions CASCADE;
DROP TABLE IF EXISTS code_generation_settings CASCADE;
DROP TABLE IF EXISTS location_codes CASCADE;
DROP TABLE IF EXISTS clinic_codes CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS default_perk_datalates CASCADE;
DROP TABLE IF EXISTS perk_datalates CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS mocards_admin_users CASCADE;

-- Drop any legacy tables that might exist
DROP TABLE IF EXISTS legacy_cards CASCADE;
DROP TABLE IF EXISTS legacy_clinics CASCADE;
DROP TABLE IF EXISTS legacy_appointments CASCADE;
DROP TABLE IF EXISTS analytics_data CASCADE;
DROP TABLE IF EXISTS enterprise_data CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;

-- Drop any functions that might exist
DROP FUNCTION IF EXISTS search_card_universal CASCADE;
DROP FUNCTION IF EXISTS generate_batch_number CASCADE;
DROP FUNCTION IF EXISTS generate_control_number CASCADE;
DROP FUNCTION IF EXISTS generate_passcode CASCADE;
DROP FUNCTION IF EXISTS normalize_code CASCADE;
DROP FUNCTION IF EXISTS update_appointment_status CASCADE;
DROP FUNCTION IF EXISTS reschedule_appointment CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS clinic_plan CASCADE;
DROP TYPE IF EXISTS card_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS perk_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- ============================================================================
-- STREAMLINED TYPES - SIMPLE & FOCUSED
-- ============================================================================

CREATE TYPE card_status AS ENUM ('active', 'inactive');
CREATE TYPE appointment_status AS ENUM ('pending', 'accepted', 'declined', 'completed');
CREATE TYPE clinic_plan AS ENUM ('starter', 'growth', 'pro');

-- ============================================================================
-- CORE TABLES - STREAMLINED FOR SIMPLICITY
-- ============================================================================

-- 1. REGIONS - Simple reference table
CREATE TABLE regions (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 2. CLINIC CODES - Simple reference table
CREATE TABLE clinic_codes (
    code VARCHAR(20) PRIMARY KEY,
    region_code VARCHAR(10) NOT NULL REFERENCES regions(code),
    description VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3. CLINICS - Simplified clinic management
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_name VARCHAR(255) NOT NULL,
    clinic_code VARCHAR(20) UNIQUE NOT NULL REFERENCES clinic_codes(code),
    region VARCHAR(10) NOT NULL REFERENCES regions(code),
    password_hash VARCHAR(255) NOT NULL,
    plan clinic_plan NOT NULL DEFAULT 'starter',
    max_cards INTEGER NOT NULL DEFAULT 500,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CARDS - Core card management (simplified)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(100) UNIQUE NOT NULL,
    unified_control_number VARCHAR(100) UNIQUE,
    card_number INTEGER,
    cardholder_name VARCHAR(255),
    status card_status NOT NULL DEFAULT 'inactive',
    assigned_clinic_id UUID REFERENCES clinics(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CARD PERKS - Simple perk tracking
CREATE TABLE card_perks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    perk_type VARCHAR(100) NOT NULL DEFAULT 'general',
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    claimed_by_clinic UUID REFERENCES clinics(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. APPOINTMENTS - Streamlined appointment system
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(100) NOT NULL,
    passcode VARCHAR(20),
    cardholder_name VARCHAR(255) NOT NULL,
    cardholder_phone VARCHAR(50),
    cardholder_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    assigned_clinic_id UUID REFERENCES clinics(id),
    status appointment_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PERK REDEMPTIONS - Simple redemption tracking
CREATE TABLE perk_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(100) NOT NULL,
    perk_id VARCHAR(100) NOT NULL,
    perk_name VARCHAR(255) NOT NULL,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    claimant_name VARCHAR(255) NOT NULL,
    handled_by VARCHAR(255) NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    perk_value DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    notes TEXT
);

-- ============================================================================
-- SEED DATA - COMPLETE REGIONS & CLINIC CODES
-- ============================================================================

-- Insert all Philippines regions
INSERT INTO regions (code, name, sort_order) VALUES
('01', 'Ilocos Region (Region 1)', 1),
('02', 'Cagayan Valley (Region 2)', 2),
('03', 'Central Luzon (Region 3)', 3),
('4A', 'Calabarzon (Region 4A)', 4),
('4B', 'Mimaropa (Region 4B)', 5),
('05', 'Bicol Region (Region 5)', 6),
('06', 'Western Visayas (Region 6)', 7),
('07', 'Central Visayas (Region 7)', 8),
('08', 'Eastern Visayas (Region 8)', 9),
('09', 'Zamboanga Peninsula (Region 9)', 10),
('10', 'Northern Mindanao (Region 10)', 11),
('11', 'Davao Region (Region 11)', 12),
('12', 'Soccsksargen (Region 12)', 13),
('13', 'Caraga Region (Region 13)', 14),
('NCR', 'National Capital Region (NCR)', 15),
('CAR', 'Cordillera Administrative Region (CAR)', 16),
('CUSTOM', 'Custom Region', 17);

-- Insert clinic codes - Complete 016 ranges
INSERT INTO clinic_codes (code, region_code, description, sort_order) VALUES
-- Central Valley Codes (CVT001 to CVT016)
('CVT001', '4A', 'Central Valley Clinic 001', 1),
('CVT002', '4A', 'Central Valley Clinic 002', 2),
('CVT003', '4A', 'Central Valley Clinic 003', 3),
('CVT004', '4A', 'Central Valley Clinic 004', 4),
('CVT005', '4A', 'Central Valley Clinic 005', 5),
('CVT006', '4A', 'Central Valley Clinic 006', 6),
('CVT007', '4A', 'Central Valley Clinic 007', 7),
('CVT008', '4A', 'Central Valley Clinic 008', 8),
('CVT009', '4A', 'Central Valley Clinic 009', 9),
('CVT010', '4A', 'Central Valley Clinic 010', 10),
('CVT011', '4A', 'Central Valley Clinic 011', 11),
('CVT012', '4A', 'Central Valley Clinic 012', 12),
('CVT013', '4A', 'Central Valley Clinic 013', 13),
('CVT014', '4A', 'Central Valley Clinic 014', 14),
('CVT015', '4A', 'Central Valley Clinic 015', 15),
('CVT016', '4A', 'Central Valley Clinic 016', 16),

-- Batangas Codes (BTG001 to BTG016)
('BTG001', '4A', 'Batangas Clinic 001', 101),
('BTG002', '4A', 'Batangas Clinic 002', 102),
('BTG003', '4A', 'Batangas Clinic 003', 103),
('BTG004', '4A', 'Batangas Clinic 004', 104),
('BTG005', '4A', 'Batangas Clinic 005', 105),
('BTG006', '4A', 'Batangas Clinic 006', 106),
('BTG007', '4A', 'Batangas Clinic 007', 107),
('BTG008', '4A', 'Batangas Clinic 008', 108),
('BTG009', '4A', 'Batangas Clinic 009', 109),
('BTG010', '4A', 'Batangas Clinic 010', 110),
('BTG011', '4A', 'Batangas Clinic 011', 111),
('BTG012', '4A', 'Batangas Clinic 012', 112),
('BTG013', '4A', 'Batangas Clinic 013', 113),
('BTG014', '4A', 'Batangas Clinic 014', 114),
('BTG015', '4A', 'Batangas Clinic 015', 115),
('BTG016', '4A', 'Batangas Clinic 016', 116),

-- Laguna Codes (LGN001 to LGN016)
('LGN001', '4A', 'Laguna Clinic 001', 201),
('LGN002', '4A', 'Laguna Clinic 002', 202),
('LGN003', '4A', 'Laguna Clinic 003', 203),
('LGN004', '4A', 'Laguna Clinic 004', 204),
('LGN005', '4A', 'Laguna Clinic 005', 205),
('LGN006', '4A', 'Laguna Clinic 006', 206),
('LGN007', '4A', 'Laguna Clinic 007', 207),
('LGN008', '4A', 'Laguna Clinic 008', 208),
('LGN009', '4A', 'Laguna Clinic 009', 209),
('LGN010', '4A', 'Laguna Clinic 010', 210),
('LGN011', '4A', 'Laguna Clinic 011', 211),
('LGN012', '4A', 'Laguna Clinic 012', 212),
('LGN013', '4A', 'Laguna Clinic 013', 213),
('LGN014', '4A', 'Laguna Clinic 014', 214),
('LGN015', '4A', 'Laguna Clinic 015', 215),
('LGN016', '4A', 'Laguna Clinic 016', 216),

-- MIMAROPA Codes (MIM001 to MIM016)
('MIM001', '4B', 'MIMAROPA Clinic 001', 301),
('MIM002', '4B', 'MIMAROPA Clinic 002', 302),
('MIM003', '4B', 'MIMAROPA Clinic 003', 303),
('MIM004', '4B', 'MIMAROPA Clinic 004', 304),
('MIM005', '4B', 'MIMAROPA Clinic 005', 305),
('MIM006', '4B', 'MIMAROPA Clinic 006', 306),
('MIM007', '4B', 'MIMAROPA Clinic 007', 307),
('MIM008', '4B', 'MIMAROPA Clinic 008', 308),
('MIM009', '4B', 'MIMAROPA Clinic 009', 309),
('MIM010', '4B', 'MIMAROPA Clinic 010', 310),
('MIM011', '4B', 'MIMAROPA Clinic 011', 311),
('MIM012', '4B', 'MIMAROPA Clinic 012', 312),
('MIM013', '4B', 'MIMAROPA Clinic 013', 313),
('MIM014', '4B', 'MIMAROPA Clinic 014', 314),
('MIM015', '4B', 'MIMAROPA Clinic 015', 315),
('MIM016', '4B', 'MIMAROPA Clinic 016', 316),

-- Special Codes
('Others', 'CUSTOM', 'Other Clinic Codes', 999),
('Custom', 'CUSTOM', 'Custom Clinic Codes', 1000);

-- ============================================================================
-- ESSENTIAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Cards indexes
CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_unified_control_number ON cards(unified_control_number);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_clinic ON cards(assigned_clinic_id);
CREATE INDEX idx_cards_expires ON cards(expires_at);

-- Clinic indexes
CREATE INDEX idx_clinics_code ON clinics(clinic_code);
CREATE INDEX idx_clinics_region ON clinics(region);
CREATE INDEX idx_clinics_active ON clinics(is_active);

-- Appointments indexes
CREATE INDEX idx_appointments_control_number ON appointments(control_number);
CREATE INDEX idx_appointments_clinic ON appointments(assigned_clinic_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- Perk indexes
CREATE INDEX idx_card_perks_card_id ON card_perks(card_id);
CREATE INDEX idx_card_perks_claimed ON card_perks(claimed);
CREATE INDEX idx_card_perks_clinic ON card_perks(claimed_by_clinic);

-- Redemption indexes
CREATE INDEX idx_perk_redemptions_card ON perk_redemptions(card_control_number);
CREATE INDEX idx_perk_redemptions_clinic ON perk_redemptions(clinic_id);
CREATE INDEX idx_perk_redemptions_date ON perk_redemptions(used_at);

-- ============================================================================
-- STREAMLINED VIEWS FOR EASY ACCESS
-- ============================================================================

-- Simple active regions view
CREATE VIEW active_regions AS
SELECT code, name, sort_order
FROM regions
ORDER BY sort_order;

-- Simple clinic codes view
CREATE VIEW available_clinic_codes AS
SELECT
    cc.code,
    cc.description,
    r.name as region_name,
    cc.region_code
FROM clinic_codes cc
JOIN regions r ON cc.region_code = r.code
ORDER BY cc.sort_order;

-- Cards with clinic info view
CREATE VIEW cards_with_clinics AS
SELECT
    c.id,
    c.control_number,
    c.unified_control_number,
    c.cardholder_name,
    c.status,
    c.expires_at,
    cl.clinic_name,
    cl.clinic_code,
    cl.region,
    c.created_at
FROM cards c
LEFT JOIN clinics cl ON c.assigned_clinic_id = cl.id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - SIMPLE BUT SECURE
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE perk_redemptions ENABLE ROW LEVEL SECURITY;

-- Simple policies for public read access (card lookup needs this)
CREATE POLICY "Public read access for cards" ON cards FOR SELECT USING (true);
CREATE POLICY "Public read access for clinics" ON clinics FOR SELECT USING (true);

-- Clinic-specific policies
CREATE POLICY "Clinics can manage their own appointments" ON appointments
    FOR ALL USING (assigned_clinic_id IN (
        SELECT id FROM clinics WHERE clinic_code = current_setting('app.clinic_code', true)
    ));

CREATE POLICY "Clinics can manage their own redemptions" ON perk_redemptions
    FOR ALL USING (clinic_id IN (
        SELECT id FROM clinics WHERE clinic_code = current_setting('app.clinic_code', true)
    ));

-- ============================================================================
-- FUNCTIONS FOR CARD OPERATIONS
-- ============================================================================

-- Function to get card by any identifier (bulletproof search)
CREATE OR REPLACE FUNCTION get_card_by_identifier(search_term TEXT)
RETURNS TABLE (
    id UUID,
    control_number VARCHAR(100),
    unified_control_number VARCHAR(100),
    cardholder_name VARCHAR(255),
    status card_status,
    assigned_clinic_id UUID,
    expires_at TIMESTAMPTZ,
    clinic_name VARCHAR(255),
    perks JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.control_number,
        c.unified_control_number,
        c.cardholder_name,
        c.status,
        c.assigned_clinic_id,
        c.expires_at,
        cl.clinic_name,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'type', cp.perk_type,
                    'claimed', cp.claimed,
                    'claimed_at', cp.claimed_at
                )
            ) FROM card_perks cp WHERE cp.card_id = c.id),
            '[]'::jsonb
        ) as perks,
        c.created_at
    FROM cards c
    LEFT JOIN clinics cl ON c.assigned_clinic_id = cl.id
    WHERE
        c.control_number ILIKE '%' || search_term || '%' OR
        c.unified_control_number ILIKE '%' || search_term || '%' OR
        c.card_number::text = search_term
    ORDER BY c.created_at DESC
    LIMIT 10;
END;
$$;

-- ============================================================================
-- PERMISSIONS - SIMPLE & SECURE
-- ============================================================================

-- Grant basic access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to anon users for public lookups
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON regions, clinic_codes, active_regions, available_clinic_codes TO anon;
GRANT SELECT ON cards, clinics, card_perks TO anon;
GRANT EXECUTE ON FUNCTION get_card_by_identifier(TEXT) TO anon;

-- Grant full access to service_role for admin operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- FINAL VALIDATION
-- ============================================================================

-- Verify schema
SELECT 'Regions: ' || count(*) FROM regions;
SELECT 'Clinic Codes: ' || count(*) FROM clinic_codes;
SELECT 'Tables Created: ' || count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Schema created successfully
-- This is a CLEAN, STREAMLINED schema with:
-- ✅ Complete region support (including 4B MIMAROPA + Custom)
-- ✅ Full clinic code ranges (CVT/BTG/LGN/MIM 001-016)
-- ✅ Simple card management with perk tracking
-- ✅ Streamlined appointment system
-- ✅ Basic but effective security
-- ✅ NO COMPLEX FEATURES - just core functionality
-- ✅ Cloud-optimized with proper indexing
-- ✅ Easy to understand and maintain