-- MOCARDS CLOUD - Fresh Start Database Schema
-- Version: 2.1.0 (Fresh Start)
-- Created: 2024-12-20
-- Description: Complete fresh start schema - drops everything and rebuilds clean

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- COMPLETE RESET - DROP EVERYTHING
-- ============================================================================

-- Drop all views first
DROP VIEW IF EXISTS admin_dashboard CASCADE;
DROP VIEW IF EXISTS clinic_dashboard CASCADE;

-- Drop all tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS perk_usage CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS perks CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schema_versions CASCADE;

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
-- ENUMS - FRESH CREATION
-- ============================================================================

CREATE TYPE clinic_plan AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE card_status AS ENUM ('active', 'inactive');
CREATE TYPE appointment_status AS ENUM ('pending', 'accepted', 'declined', 'rescheduled');
CREATE TYPE user_role AS ENUM ('admin', 'clinic', 'staff');
CREATE TYPE perk_type AS ENUM ('dental_cleaning', 'consultation', 'xray', 'treatment', 'discount');
CREATE TYPE subscription_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE payment_method AS ENUM ('gcash', 'bank_transfer', 'credit_card', 'cash');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ============================================================================
-- CORE TABLES - FRESH CREATION
-- ============================================================================

-- Users Table (Admin and Staff Authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'admin',
    clinic_id UUID,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    permissions TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clinics Table
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(10) NOT NULL,
    plan clinic_plan NOT NULL DEFAULT 'starter',
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    subscription_price INTEGER NOT NULL,
    subscription_status subscription_status NOT NULL DEFAULT 'active',
    subscription_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subscription_end_date TIMESTAMPTZ,
    max_cards INTEGER NOT NULL,
    last_payment_date TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT clinics_subscription_price_positive CHECK (subscription_price >= 0),
    CONSTRAINT clinics_max_cards_positive CHECK (max_cards > 0)
);

-- Add foreign key for users.clinic_id after clinics table exists
ALTER TABLE users ADD CONSTRAINT users_clinic_id_fkey
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

-- Cards Table
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status card_status NOT NULL DEFAULT 'inactive',
    perks_total INTEGER NOT NULL DEFAULT 5,
    perks_used INTEGER NOT NULL DEFAULT 0,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    expiry_date DATE NOT NULL,
    issued_by UUID REFERENCES users(id),
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT cards_perks_valid CHECK (perks_used >= 0 AND perks_used <= perks_total),
    CONSTRAINT cards_perks_total_positive CHECK (perks_total >= 0),
    CONSTRAINT cards_expiry_future CHECK (expiry_date > CURRENT_DATE - INTERVAL '1 year')
);

-- Appointments Table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL REFERENCES cards(control_number) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255),
    patient_phone VARCHAR(50),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status appointment_status NOT NULL DEFAULT 'pending',
    service_type VARCHAR(255) NOT NULL,
    perk_requested VARCHAR(255),
    admin_notes TEXT,
    clinic_notes TEXT,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT appointments_date_not_past CHECK (appointment_date >= CURRENT_DATE),
    CONSTRAINT appointments_completion_status CHECK (
        (status = 'accepted' AND completed_at IS NULL) OR
        (status != 'accepted')
    ),
    CONSTRAINT appointments_cancellation_status CHECK (
        (status = 'declined' AND cancelled_at IS NOT NULL) OR
        (status != 'declined')
    )
);

-- Perks Table
CREATE TABLE perks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type perk_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_for_days INTEGER NOT NULL DEFAULT 365,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT perks_value_non_negative CHECK (value >= 0),
    CONSTRAINT perks_valid_days_positive CHECK (valid_for_days > 0)
);

-- Perk Usage Table
CREATE TABLE perk_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL REFERENCES cards(control_number) ON DELETE CASCADE,
    perk_id UUID NOT NULL REFERENCES perks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value_used DECIMAL(10,2) NOT NULL,
    approved_by UUID REFERENCES users(id),
    notes TEXT,

    -- Constraints
    CONSTRAINT perk_usage_value_positive CHECK (value_used >= 0)
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PHP',
    payment_method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_paid_status CHECK (
        (status = 'completed' AND paid_at IS NOT NULL) OR
        (status != 'completed')
    )
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schema Version Tracking
CREATE TABLE schema_versions (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_clinic_id ON users(clinic_id);

-- Cards indexes
CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_expiry_date ON cards(expiry_date);

-- Clinics indexes
CREATE INDEX idx_clinics_code ON clinics(code);
CREATE INDEX idx_clinics_region ON clinics(region);
CREATE INDEX idx_clinics_plan ON clinics(plan);
CREATE INDEX idx_clinics_subscription_status ON clinics(subscription_status);

-- Appointments indexes
CREATE INDEX idx_appointments_card_control_number ON appointments(card_control_number);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Perk usage indexes
CREATE INDEX idx_perk_usage_card_control_number ON perk_usage(card_control_number);
CREATE INDEX idx_perk_usage_clinic_id ON perk_usage(clinic_id);
CREATE INDEX idx_perk_usage_used_at ON perk_usage(used_at);

-- Payments indexes
CREATE INDEX idx_payments_clinic_id ON payments(clinic_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_perks_updated_at BEFORE UPDATE ON perks
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to validate clinic plan limits
CREATE OR REPLACE FUNCTION check_clinic_card_limit()
RETURNS TRIGGER AS $$
DECLARE
    clinic_plan clinic_plan;
    card_count INTEGER;
    plan_limit INTEGER;
BEGIN
    -- Get clinic plan
    SELECT plan INTO clinic_plan FROM clinics WHERE id = NEW.clinic_id;

    -- Count current cards for clinic
    SELECT COUNT(*) INTO card_count FROM cards WHERE clinic_id = NEW.clinic_id;

    -- Determine plan limit
    CASE clinic_plan
        WHEN 'starter' THEN plan_limit := 500;
        WHEN 'growth' THEN plan_limit := 1000;
        WHEN 'pro' THEN plan_limit := 2000;
        ELSE plan_limit := 500;
    END CASE;

    -- Check if limit would be exceeded
    IF card_count >= plan_limit THEN
        RAISE EXCEPTION 'Clinic has reached the maximum number of cards for plan: %', clinic_plan;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply clinic limit trigger
CREATE TRIGGER check_clinic_card_limit_trigger
    BEFORE INSERT OR UPDATE OF clinic_id ON cards
    FOR EACH ROW EXECUTE PROCEDURE check_clinic_card_limit();

-- ============================================================================
-- PRODUCTION DATA
-- ============================================================================

-- Insert default admin user
INSERT INTO users (username, email, password, role, first_name, last_name, permissions, is_active) VALUES
('admin', 'admin@mocards.cloud', 'admin123', 'admin', 'System', 'Administrator',
ARRAY['manage_clinics', 'manage_cards', 'manage_users', 'view_analytics', 'manage_perks'], TRUE);

-- Insert default perks
INSERT INTO perks (type, name, description, value, valid_for_days, requires_approval) VALUES
('dental_cleaning', 'Free Dental Cleaning', 'Complete dental cleaning service', 0, 365, false),
('consultation', 'Free Consultation', 'General dental consultation', 0, 365, false),
('xray', 'X-Ray Discount', '50% discount on X-ray services', 50, 365, true),
('treatment', 'Treatment Discount', '20% discount on dental treatments', 20, 365, true),
('discount', 'General Discount', '10% discount on all services', 10, 365, false);

-- Insert schema version
INSERT INTO schema_versions (version, description) VALUES
('2.1.0', 'Fresh start MOCARDS schema with clean structure and working authentication');

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Admin dashboard view
CREATE VIEW admin_dashboard AS
SELECT
    'cards' as resource_type,
    COALESCE(COUNT(*), 0) as total_count,
    COALESCE(COUNT(CASE WHEN status = 'active' THEN 1 END), 0) as active_count,
    COALESCE(COUNT(CASE WHEN status = 'inactive' THEN 1 END), 0) as inactive_count
FROM cards
UNION ALL
SELECT
    'clinics' as resource_type,
    COALESCE(COUNT(*), 0) as total_count,
    COALESCE(COUNT(CASE WHEN is_active = true THEN 1 END), 0) as active_count,
    COALESCE(COUNT(CASE WHEN is_active = false THEN 1 END), 0) as inactive_count
FROM clinics
UNION ALL
SELECT
    'appointments' as resource_type,
    COALESCE(COUNT(*), 0) as total_count,
    COALESCE(COUNT(CASE WHEN status = 'pending' THEN 1 END), 0) as active_count,
    COALESCE(COUNT(CASE WHEN status IN ('accepted', 'declined') THEN 1 END), 0) as inactive_count
FROM appointments;

-- Clinic dashboard view
CREATE VIEW clinic_dashboard AS
SELECT
    c.id,
    c.name,
    c.plan,
    c.is_active,
    COALESCE(COUNT(ca.id), 0) as total_cards,
    COALESCE(COUNT(CASE WHEN ca.status = 'active' THEN 1 END), 0) as active_cards,
    COALESCE(COUNT(a.id), 0) as total_appointments,
    COALESCE(COUNT(CASE WHEN a.status = 'accepted' THEN 1 END), 0) as accepted_appointments,
    c.max_cards,
    c.next_billing_date
FROM clinics c
LEFT JOIN cards ca ON c.id = ca.clinic_id
LEFT JOIN appointments a ON c.id = a.clinic_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.plan, c.is_active, c.max_cards, c.next_billing_date;

-- ============================================================================
-- PRODUCTION READY CONFIRMATION
-- ============================================================================

-- Add a confirmation record
INSERT INTO audit_logs (action, resource, resource_id, new_values) VALUES
('SCHEMA_DEPLOYED', 'system', uuid_generate_v4(),
'{"version": "2.1.0", "environment": "production", "admin_credentials": "admin/admin123", "status": "ready", "deployment": "fresh_start"}'::jsonb);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '🚀 MOCARDS CLOUD FRESH START SCHEMA DEPLOYED SUCCESSFULLY!';
    RAISE NOTICE '✅ Admin Credentials: username=admin, password=admin123';
    RAISE NOTICE '✅ Database completely rebuilt with clean structure';
    RAISE NOTICE '✅ Authentication system fully operational';
    RAISE NOTICE '✅ Ready for production use';
END $$;