-- ===============================================
-- MOCARDS ENTERPRISE PRODUCTION SCHEMA - UPDATED FOR CLINIC MANAGEMENT APP
-- ===============================================
-- Enterprise-grade schema with sequences, constraints, and audit trails
-- Optimized for high-volume card number generation
-- UPDATED: Clinic schema aligned with ClinicManagementApp requirements

-- ===============================================
-- STEP 1: CLEAN SLATE
-- ===============================================

-- Drop existing tables if they exist (clean deployment)
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.card_audit_log CASCADE;
DROP TABLE IF EXISTS app_clinics.clinics CASCADE;
DROP TABLE IF EXISTS app_clinics.clinic_plans CASCADE;

-- Drop existing sequences
DROP SEQUENCE IF EXISTS public.card_number_seq CASCADE;

-- Drop policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "cards_access_policy" ON public.cards;
    DROP POLICY IF EXISTS "clinics_access_policy" ON app_clinics.clinics;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ===============================================
-- STEP 2: CREATE SCHEMAS
-- ===============================================

CREATE SCHEMA IF NOT EXISTS app_clinics;

-- ===============================================
-- STEP 3: ENTERPRISE SEQUENCES FOR CARD NUMBERS
-- ===============================================

-- Enterprise sequence for guaranteed unique card numbers
CREATE SEQUENCE public.card_number_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 99999999
    CACHE 50
    NO CYCLE;

-- Function to generate card control numbers
CREATE OR REPLACE FUNCTION generate_card_control_number()
RETURNS TEXT AS $$
DECLARE
    next_num BIGINT;
BEGIN
    next_num := nextval('public.card_number_seq');
    RETURN 'MOC' || LPAD(next_num::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- STEP 4: ENTERPRISE CLINIC MANAGEMENT
-- ===============================================

-- Clinic plans with enterprise features
CREATE TABLE app_clinics.clinic_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    max_cards INTEGER NOT NULL CHECK (max_cards > 0),
    price_monthly DECIMAL(10,2) NOT NULL CHECK (price_monthly >= 0),
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enterprise clinics table - UPDATED FOR CLINIC MANAGEMENT APP
CREATE TABLE app_clinics.clinics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    contact_number VARCHAR(20),
    address TEXT,
    region VARCHAR(100) NOT NULL,
    plan VARCHAR(20) NOT NULL DEFAULT 'starter',
    area_code VARCHAR(10) NOT NULL,
    custom_area_code VARCHAR(10),
    password_hash TEXT NOT NULL,
    admin_clinic VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    subscription_status VARCHAR(20) DEFAULT 'active',
    max_cards_allowed INTEGER DEFAULT 1000,
    cards_generated_count INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enterprise constraints
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    CONSTRAINT valid_plan CHECK (plan IN ('starter', 'growth', 'pro')),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ===============================================
-- STEP 5: ENTERPRISE CARDS TABLE
-- ===============================================

-- Main cards table with enterprise features
CREATE TABLE public.cards (
    id SERIAL PRIMARY KEY,
    control_number VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_card_control_number(),
    full_name VARCHAR(255) DEFAULT '',
    birth_date DATE DEFAULT '1990-01-01',
    address TEXT DEFAULT '',
    contact_number VARCHAR(20) DEFAULT '',
    emergency_contact VARCHAR(20) DEFAULT '',
    clinic_id INTEGER REFERENCES app_clinics.clinics(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'inactive',
    perks_total INTEGER DEFAULT 10 CHECK (perks_total >= 0),
    perks_used INTEGER DEFAULT 0 CHECK (perks_used >= 0 AND perks_used <= perks_total),
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    qr_code_data TEXT,
    is_demo BOOLEAN DEFAULT false,
    batch_id VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enterprise constraints
    CONSTRAINT valid_status CHECK (status IN ('inactive', 'active', 'suspended', 'expired', 'cancelled')),
    CONSTRAINT valid_dates CHECK (expiry_date > issue_date),
    CONSTRAINT valid_perks CHECK (perks_used <= perks_total)
);

-- ===============================================
-- STEP 6: ENTERPRISE AUDIT LOGGING
-- ===============================================

-- Audit log for card operations
CREATE TABLE public.card_audit_log (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES public.cards(id) ON DELETE CASCADE,
    control_number VARCHAR(20) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enterprise constraints
    CONSTRAINT valid_operation CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'SUSPEND'))
);

-- ===============================================
-- STEP 7: ENTERPRISE TRIGGERS
-- ===============================================

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_card_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.card_audit_log (card_id, control_number, operation, new_values)
        VALUES (NEW.id, NEW.control_number, 'CREATE', row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.card_audit_log (card_id, control_number, operation, old_values, new_values)
        VALUES (NEW.id, NEW.control_number, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.card_audit_log (card_id, control_number, operation, old_values)
        VALUES (OLD.id, OLD.control_number, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER cards_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION audit_card_changes();

-- Trigger to update clinic card count
CREATE OR REPLACE FUNCTION update_clinic_card_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.clinic_id IS NOT NULL THEN
        UPDATE app_clinics.clinics
        SET cards_generated_count = cards_generated_count + 1
        WHERE id = NEW.clinic_id;
    ELSIF TG_OP = 'DELETE' AND OLD.clinic_id IS NOT NULL THEN
        UPDATE app_clinics.clinics
        SET cards_generated_count = cards_generated_count - 1
        WHERE id = OLD.clinic_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clinic_card_count_trigger
    AFTER INSERT OR DELETE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION update_clinic_card_count();

-- ===============================================
-- STEP 8: ENTERPRISE INDEXES
-- ===============================================

-- High-performance indexes for card operations
CREATE INDEX idx_cards_control_number ON public.cards(control_number);
CREATE INDEX idx_cards_clinic_id ON public.cards(clinic_id);
CREATE INDEX idx_cards_status ON public.cards(status);
CREATE INDEX idx_cards_created_at ON public.cards(created_at);
CREATE INDEX idx_cards_batch_id ON public.cards(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_cards_demo ON public.cards(is_demo) WHERE is_demo = true;

-- Clinic indexes
CREATE INDEX idx_clinics_code ON app_clinics.clinics(code);
CREATE INDEX idx_clinics_email ON app_clinics.clinics(email);
CREATE INDEX idx_clinics_active ON app_clinics.clinics(is_active) WHERE is_active = true;

-- Audit log indexes
CREATE INDEX idx_audit_card_id ON public.card_audit_log(card_id);
CREATE INDEX idx_audit_created_at ON public.card_audit_log(created_at);
CREATE INDEX idx_audit_operation ON public.card_audit_log(operation);

-- ===============================================
-- STEP 9: ENTERPRISE SECURITY (RLS)
-- ===============================================

-- Enable Row Level Security
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_clinics.clinics ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for admin access
CREATE POLICY "cards_admin_access" ON public.cards FOR ALL USING (true);
CREATE POLICY "clinics_admin_access" ON app_clinics.clinics FOR ALL USING (true);

-- ===============================================
-- STEP 10: ENTERPRISE DATA
-- ===============================================

-- Insert enterprise clinic plans
INSERT INTO app_clinics.clinic_plans (name, description, max_cards, price_monthly, features) VALUES
('Starter Pro', 'Professional starter plan', 1000, 49.99, '{"support": "email", "analytics": true, "api_access": false}'),
('Business', 'Growing business plan', 5000, 149.99, '{"support": "priority", "analytics": true, "api_access": true}'),
('Enterprise', 'Full enterprise solution', 50000, 499.99, '{"support": "dedicated", "analytics": true, "api_access": true, "white_label": true}');

-- Insert demo clinic with updated schema fields
INSERT INTO app_clinics.clinics (
    name, username, code, email, contact_number, address, region,
    plan, area_code, password_hash, admin_clinic, max_cards_allowed
)
VALUES (
    'MOCARDS Demo Enterprise Clinic',
    'demo',
    'DEMO001',
    'demo@mocards.enterprise',
    '+63917123456',
    '123 Enterprise Ave, Makati Business District, Metro Manila',
    'National Capital Region (NCR)',
    'growth',
    'NCR001',
    'demo123',
    'Dr. Demo Admin',
    5000
);

-- Generate initial demo cards with batch tracking
DO $$
DECLARE
    clinic_id_var INTEGER;
    batch_id_var VARCHAR(50);
    i INTEGER;
BEGIN
    -- Get the demo clinic ID
    SELECT id INTO clinic_id_var FROM app_clinics.clinics WHERE code = 'DEMO001';

    -- Create batch ID
    batch_id_var := 'DEMO_BATCH_' || EXTRACT(EPOCH FROM NOW())::BIGINT;

    -- Generate 20 demo cards
    FOR i IN 1..20 LOOP
        INSERT INTO public.cards (
            full_name, clinic_id, status, batch_id, is_demo, metadata
        ) VALUES (
            'Demo Patient ' || i,
            clinic_id_var,
            CASE WHEN i <= 10 THEN 'active' ELSE 'inactive' END,
            batch_id_var,
            true,
            ('{"demo": true, "sequence": ' || i || ', "generated_at": "' || NOW() || '"}')::jsonb
        );
    END LOOP;
END $$;

-- ===============================================
-- STEP 11: ENTERPRISE FUNCTIONS
-- ===============================================

-- Function to bulk generate cards
CREATE OR REPLACE FUNCTION bulk_generate_cards(
    p_quantity INTEGER,
    p_clinic_id INTEGER DEFAULT NULL,
    p_batch_name VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE(
    control_number VARCHAR(20),
    card_id INTEGER,
    batch_id VARCHAR(50)
) AS $$
DECLARE
    batch_id_var VARCHAR(50);
    i INTEGER;
    card_record RECORD;
BEGIN
    -- Validate input
    IF p_quantity <= 0 OR p_quantity > 10000 THEN
        RAISE EXCEPTION 'Quantity must be between 1 and 10000';
    END IF;

    -- Generate batch ID
    batch_id_var := COALESCE(p_batch_name, 'BATCH_' || EXTRACT(EPOCH FROM NOW())::BIGINT);

    -- Generate cards
    FOR i IN 1..p_quantity LOOP
        INSERT INTO public.cards (clinic_id, batch_id)
        VALUES (p_clinic_id, batch_id_var)
        RETURNING cards.control_number, cards.id INTO card_record;

        control_number := card_record.control_number;
        card_id := card_record.id;
        batch_id := batch_id_var;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- SUCCESS MESSAGE & VERIFICATION
-- ===============================================

SELECT '🏆 ENTERPRISE SCHEMA DEPLOYED!' as "STATUS";
SELECT 'Next card number: ' || generate_card_control_number() as "CARD_SEQUENCE";
SELECT 'Demo clinic: Username=demo / Password=demo123 / Code=DEMO001' as "LOGIN";
SELECT COUNT(*) || ' demo cards created' as "DEMO_DATA" FROM public.cards WHERE is_demo = true;

-- Test bulk generation function
SELECT '🚀 Testing bulk generation...' as "TEST";
SELECT control_number, batch_id FROM bulk_generate_cards(5, NULL, 'TEST_BATCH');

SELECT '💎 ENTERPRISE READY FOR PRODUCTION!' as "FINAL_STATUS";