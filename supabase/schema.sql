-- MOCARDS CLOUD - Supabase Database Schema
-- Version: 1.0.0
-- Created: 2025-12-19
-- Description: Complete database schema for MOCARDS CLOUD system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE clinic_plan AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE card_status AS ENUM ('active', 'inactive');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE user_role AS ENUM ('admin', 'clinic', 'staff');
CREATE TYPE perk_type AS ENUM ('dental_cleaning', 'consultation', 'xray', 'treatment', 'discount');
CREATE TYPE subscription_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE payment_method AS ENUM ('gcash', 'bank_transfer', 'credit_card', 'cash');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

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
    password_hash TEXT NOT NULL,
    subscription_price INTEGER NOT NULL, -- Price in PHP centavos
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

-- Cards Table
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL, -- Format: MOC-{ID}-{REGION}-{CODE}
    full_name VARCHAR(255) NOT NULL,
    status card_status NOT NULL DEFAULT 'inactive',
    perks_total INTEGER NOT NULL DEFAULT 5,
    perks_used INTEGER NOT NULL DEFAULT 0,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    expiry_date DATE NOT NULL,
    issued_by UUID, -- References users(id) - admin who issued
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

-- Users Table (Admin, Clinic Staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    permissions TEXT[], -- Array of permission strings
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT users_clinic_staff_has_clinic CHECK (
        (role != 'clinic' AND role != 'staff') OR clinic_id IS NOT NULL
    )
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
    status appointment_status NOT NULL DEFAULT 'scheduled',
    service_type VARCHAR(255) NOT NULL,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT appointments_date_not_past CHECK (appointment_date >= CURRENT_DATE),
    CONSTRAINT appointments_completion_status CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    ),
    CONSTRAINT appointments_cancellation_status CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
        (status != 'cancelled' AND cancelled_at IS NULL)
    )
);

-- Perks Table
CREATE TABLE perks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type perk_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(10,2) NOT NULL DEFAULT 0, -- Value in PHP or percentage
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
    amount INTEGER NOT NULL, -- Amount in PHP centavos
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

-- Audit Log Table
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Index for performance
    INDEX idx_audit_logs_resource (resource, resource_id),
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_created_at (created_at)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

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

-- Users indexes
CREATE INDEX idx_users_clinic_id ON users(clinic_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Perk usage indexes
CREATE INDEX idx_perk_usage_card_control_number ON perk_usage(card_control_number);
CREATE INDEX idx_perk_usage_clinic_id ON perk_usage(clinic_id);
CREATE INDEX idx_perk_usage_used_at ON perk_usage(used_at);

-- Payments indexes
CREATE INDEX idx_payments_clinic_id ON payments(clinic_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

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

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE perk_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see everything
CREATE POLICY "Admins can manage all data" ON clinics FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage all cards" ON cards FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Clinics can only see their own data
CREATE POLICY "Clinics can see own data" ON clinics FOR SELECT USING (
    id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Clinics can see own cards" ON cards FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Clinics can see own appointments" ON appointments FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default perks
INSERT INTO perks (type, name, description, value, valid_for_days, requires_approval) VALUES
('dental_cleaning', 'Free Dental Cleaning', 'Complete dental cleaning service', 0, 365, false),
('consultation', 'Free Consultation', 'General dental consultation', 0, 365, false),
('xray', 'X-Ray Discount', '50% discount on X-ray services', 50, 365, true),
('treatment', 'Treatment Discount', '20% discount on dental treatments', 20, 365, true),
('discount', 'General Discount', '10% discount on all services', 10, 365, false);

-- Insert default admin user (password: admin123 - change in production!)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, permissions) VALUES
('admin', 'admin@mocards.cloud', '$2b$10$rOvD0BIWQ0Wgb6p2rQzX4OxKBm.JhXJOYCQzxQaFhJkbO8v.NhTWy', 'admin', 'System', 'Administrator',
ARRAY['manage_clinics', 'manage_cards', 'manage_users', 'view_analytics', 'manage_perks']);

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================

CREATE TABLE schema_versions (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_versions (version, description) VALUES
('1.0.0', 'Initial MOCARDS CLOUD schema with all core tables and features');

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Clinic dashboard view
CREATE VIEW clinic_dashboard AS
SELECT
    c.id,
    c.name,
    c.plan,
    c.subscription_status,
    COUNT(ca.id) as total_cards,
    COUNT(CASE WHEN ca.status = 'active' THEN 1 END) as active_cards,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
    c.max_cards,
    c.next_billing_date
FROM clinics c
LEFT JOIN cards ca ON c.id = ca.clinic_id
LEFT JOIN appointments a ON c.id = a.clinic_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.plan, c.subscription_status, c.max_cards, c.next_billing_date;

-- Card activity view
CREATE VIEW card_activity AS
SELECT
    ca.control_number,
    ca.full_name,
    ca.status,
    ca.perks_total,
    ca.perks_used,
    cl.name as clinic_name,
    cl.plan as clinic_plan,
    COUNT(a.id) as appointment_count,
    COUNT(pu.id) as perk_usage_count,
    ca.created_at,
    ca.updated_at
FROM cards ca
LEFT JOIN clinics cl ON ca.clinic_id = cl.id
LEFT JOIN appointments a ON ca.control_number = a.card_control_number
LEFT JOIN perk_usage pu ON ca.control_number = pu.card_control_number
GROUP BY ca.control_number, ca.full_name, ca.status, ca.perks_total, ca.perks_used,
         cl.name, cl.plan, ca.created_at, ca.updated_at;