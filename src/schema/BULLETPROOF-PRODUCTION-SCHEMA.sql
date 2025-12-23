-- ========================================
-- MOCARDS CLOUD - BULLETPROOF PRODUCTION SCHEMA
-- Version 3.0.2 - UNIVERSAL COMPATIBILITY
-- Generated: December 23, 2024
-- Client: Dental Group Philippines
-- ========================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- CORE TABLES (SIMPLIFIED & BULLETPROOF)
-- ========================================

-- Admin Users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinics table
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(20) DEFAULT 'starter',
    region VARCHAR(10) NOT NULL,
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    max_cards INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cards table
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'inactive',
    perks_total INTEGER DEFAULT 5,
    perks_used INTEGER DEFAULT 0,
    clinic_id UUID,
    expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    notes TEXT,
    issued_by UUID,
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Perks table
CREATE TABLE perks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'service',
    value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_for_days INTEGER DEFAULT 365,
    requires_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255),
    patient_phone VARCHAR(50),
    date DATE NOT NULL,
    time TIME NOT NULL,
    clinic_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    service_type VARCHAR(255) NOT NULL,
    notes TEXT,
    perk_requested VARCHAR(255),
    created_by UUID,
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- Perk redemptions table
CREATE TABLE perk_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL,
    perk_id UUID NOT NULL,
    clinic_id UUID NOT NULL,
    value_redeemed DECIMAL(10,2) DEFAULT 0,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type VARCHAR(20) NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details TEXT, -- Using TEXT instead of JSONB for compatibility
    ip_address VARCHAR(45), -- Using VARCHAR instead of INET
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type VARCHAR(20) NOT NULL,
    user_id UUID NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ADD FOREIGN KEY CONSTRAINTS SEPARATELY
-- ========================================

-- Add foreign key constraints after all tables are created
ALTER TABLE cards ADD CONSTRAINT fk_cards_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;
ALTER TABLE cards ADD CONSTRAINT fk_cards_issuer FOREIGN KEY (issued_by) REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE appointments ADD CONSTRAINT fk_appointments_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_creator FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_processor FOREIGN KEY (processed_by) REFERENCES clinics(id) ON DELETE SET NULL;

ALTER TABLE perk_redemptions ADD CONSTRAINT fk_redemptions_perk FOREIGN KEY (perk_id) REFERENCES perks(id) ON DELETE CASCADE;
ALTER TABLE perk_redemptions ADD CONSTRAINT fk_redemptions_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE perk_redemptions ADD CONSTRAINT fk_redemptions_approver FOREIGN KEY (approved_by) REFERENCES clinics(id) ON DELETE SET NULL;

-- ========================================
-- BASIC CONSTRAINTS (COMPATIBLE)
-- ========================================

-- Check constraints that work everywhere
ALTER TABLE clinics ADD CONSTRAINT chk_plan CHECK (plan IN ('starter', 'growth', 'pro'));
ALTER TABLE clinics ADD CONSTRAINT chk_subscription CHECK (subscription_status IN ('active', 'inactive', 'suspended'));

ALTER TABLE cards ADD CONSTRAINT chk_status CHECK (status IN ('active', 'inactive'));
ALTER TABLE cards ADD CONSTRAINT chk_perks_positive CHECK (perks_total >= 0 AND perks_used >= 0);
ALTER TABLE cards ADD CONSTRAINT chk_perks_logic CHECK (perks_used <= perks_total);

ALTER TABLE perks ADD CONSTRAINT chk_perk_type CHECK (type IN ('service', 'discount', 'product', 'consultation'));
ALTER TABLE perks ADD CONSTRAINT chk_valid_days CHECK (valid_for_days > 0);

ALTER TABLE appointments ADD CONSTRAINT chk_appointment_status CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled'));

ALTER TABLE activity_logs ADD CONSTRAINT chk_user_type CHECK (user_type IN ('admin', 'clinic'));
ALTER TABLE user_sessions ADD CONSTRAINT chk_session_user_type CHECK (user_type IN ('admin', 'clinic'));

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Essential indexes
CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX idx_cards_status ON cards(status);

CREATE INDEX idx_clinics_code ON clinics(code);
CREATE INDEX idx_clinics_region ON clinics(region);
CREATE INDEX idx_clinics_active ON clinics(is_active);

CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Simple trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_perks_updated_at BEFORE UPDATE ON perks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- UTILITY FUNCTIONS (SIMPLE)
-- ========================================

-- Simple control number generator
CREATE OR REPLACE FUNCTION generate_control_number(
    card_id INTEGER,
    region_code VARCHAR(5),
    area_code VARCHAR(10)
) RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'MOC-' || LPAD(card_id::TEXT, 5, '0') || '-' || region_code || '-' || area_code;
END;
$$ LANGUAGE plpgsql;

-- Session cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DEFAULT DATA
-- ========================================

-- Insert default admin (password: admin123)
INSERT INTO admin_users (username, password_hash, is_active)
VALUES ('admin', crypt('admin123', gen_salt('bf', 12)), true)
ON CONFLICT (username) DO NOTHING;

-- Insert default perks
INSERT INTO perks (name, description, type, value, is_active) VALUES
('Free Dental Consultation', 'Complimentary consultation with our dental professionals', 'consultation', 0, true),
('10% Discount on Cleaning', '10% discount on professional teeth cleaning services', 'discount', 10, true),
('Free Teeth Whitening Session', 'One complimentary teeth whitening treatment', 'service', 500, true),
('Priority Appointment Booking', 'Skip the queue with priority appointment scheduling', 'service', 0, true),
('Free Dental X-Ray', 'Complimentary dental X-ray examination', 'service', 200, true),
('15% Off Dental Procedures', '15% discount on selected dental procedures', 'discount', 15, true),
('Free Oral Health Package', 'Complete oral health assessment and consultation', 'service', 300, true),
('Dental Care Kit', 'Complimentary dental care kit with toothbrush and paste', 'product', 150, true)
ON CONFLICT DO NOTHING;

-- ========================================
-- ESSENTIAL VIEWS
-- ========================================

-- Active cards view
CREATE VIEW active_cards_view AS
SELECT
    c.id,
    c.control_number,
    c.full_name,
    c.status,
    c.perks_total,
    c.perks_used,
    (c.perks_total - c.perks_used) AS perks_remaining,
    c.expiry_date,
    cl.name AS clinic_name,
    cl.code AS clinic_code,
    cl.region AS clinic_region
FROM cards c
LEFT JOIN clinics cl ON c.clinic_id = cl.id
WHERE c.status = 'active';

-- Clinic dashboard view
CREATE VIEW clinic_dashboard_view AS
SELECT
    cl.id,
    cl.name,
    cl.code,
    cl.plan,
    cl.region,
    COUNT(c.id) AS total_cards,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) AS active_cards,
    cl.max_cards,
    COUNT(a.id) AS total_appointments
FROM clinics cl
LEFT JOIN cards c ON cl.id = c.clinic_id
LEFT JOIN appointments a ON cl.id = a.clinic_id
WHERE cl.is_active = true
GROUP BY cl.id, cl.name, cl.code, cl.plan, cl.region, cl.max_cards;

-- ========================================
-- SCHEMA VERSION
-- ========================================

CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('3.0.2', 'Bulletproof production schema - universal compatibility')
ON CONFLICT (version) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Test the schema
SELECT 'Schema installed successfully!' as status;
SELECT version, applied_at FROM schema_migrations;
SELECT username FROM admin_users;
SELECT COUNT(*) as perk_count FROM perks;

-- ========================================
-- DEPLOYMENT READY!
-- ========================================

/*
SIMPLE DEPLOYMENT:

1. Create database:
   createdb mocards_production

2. Run this file:
   psql -d mocards_production -f BULLETPROOF-PRODUCTION-SCHEMA.sql

3. Should see:
   - "Schema installed successfully!"
   - Version 3.0.2 in migrations
   - 'admin' user exists
   - 8 perks loaded

4. Change admin password:
   UPDATE admin_users SET password_hash = crypt('NewPassword123!', gen_salt('bf', 12)) WHERE username = 'admin';

DONE! 🎉
*/