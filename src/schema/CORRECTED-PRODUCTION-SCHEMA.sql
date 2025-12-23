-- ========================================
-- MOCARDS CLOUD - CORRECTED PRODUCTION SCHEMA
-- Version 3.0.1 - SECURE CLOUD DEPLOYMENT (FIXED)
-- Generated: December 23, 2024
-- Client: Dental Group Philippines
-- ========================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For password hashing
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For performance monitoring

-- ========================================
-- SECURITY SETUP
-- ========================================

-- Create dedicated application role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mocards_app') THEN
        CREATE ROLE mocards_app LOGIN PASSWORD 'SecurePassword2024!';
    END IF;
END
$$;

-- Grant necessary permissions to app role
GRANT CONNECT ON DATABASE postgres TO mocards_app;
GRANT USAGE ON SCHEMA public TO mocards_app;

-- ========================================
-- CORE TABLES
-- ========================================

-- Admin Users table - System administrators
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hashed
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinics table - Registered dental clinics
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hashed
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro')),
    region VARCHAR(10) NOT NULL,
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended')),
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    max_cards INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Security constraints (simplified for compatibility)
    CONSTRAINT valid_email CHECK (email IS NULL OR email LIKE '%@%.%'),
    CONSTRAINT valid_contact CHECK (contact_number IS NULL OR LENGTH(contact_number) >= 7)
);

-- Cards table - Core loyalty cards
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    perks_total INTEGER DEFAULT 5 CHECK (perks_total >= 0 AND perks_total <= 100),
    perks_used INTEGER DEFAULT 0 CHECK (perks_used >= 0),
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    notes TEXT,
    issued_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Business logic constraints
    CONSTRAINT perks_logic CHECK (perks_used <= perks_total),
    CONSTRAINT valid_control_number CHECK (control_number LIKE 'MOC-%'),
    CONSTRAINT future_expiry CHECK (expiry_date > CURRENT_DATE - INTERVAL '1 year')
);

-- Perks table - Available perks/benefits
CREATE TABLE IF NOT EXISTS perks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'service' CHECK (type IN ('service', 'discount', 'product', 'consultation')),
    value DECIMAL(10,2) DEFAULT 0, -- Monetary value or percentage
    is_active BOOLEAN DEFAULT true,
    valid_for_days INTEGER DEFAULT 365 CHECK (valid_for_days > 0),
    requires_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table - Patient appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255),
    patient_phone VARCHAR(50),
    date DATE NOT NULL,
    time TIME NOT NULL,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
    service_type VARCHAR(255) NOT NULL,
    notes TEXT,
    perk_requested VARCHAR(255),
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES clinics(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    -- Business constraints (simplified for compatibility)
    CONSTRAINT future_appointment CHECK (date >= CURRENT_DATE),
    CONSTRAINT valid_time CHECK (time BETWEEN '06:00:00' AND '22:00:00'),
    CONSTRAINT valid_email_appt CHECK (patient_email IS NULL OR patient_email LIKE '%@%.%')
);

-- Perk redemptions table - Track perk usage
CREATE TABLE IF NOT EXISTS perk_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL,
    perk_id UUID NOT NULL REFERENCES perks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    value_redeemed DECIMAL(10,2) DEFAULT 0,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    approved_by UUID REFERENCES clinics(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'clinic')),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session management for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'clinic')),
    user_id UUID NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_expiry_date ON cards(expiry_date);

CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_region ON clinics(region);
CREATE INDEX IF NOT EXISTS idx_clinics_plan ON clinics(plan);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_card_control ON appointments(card_control_number);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(date, time);

CREATE INDEX IF NOT EXISTS idx_perks_type ON perks(type);
CREATE INDEX IF NOT EXISTS idx_perks_active ON perks(is_active);

CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card ON perk_redemptions(card_control_number);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic ON perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_date ON perk_redemptions(redeemed_at);

-- Security and audit indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_type, user_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cards_clinic_status ON cards(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date);

-- ========================================
-- TRIGGERS FOR AUTO-UPDATE AND AUDIT
-- ========================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all main tables
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinics_updated_at ON clinics;
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_perks_updated_at ON perks;
CREATE TRIGGER update_perks_updated_at BEFORE UPDATE ON perks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to generate card control numbers
CREATE OR REPLACE FUNCTION generate_control_number(
    card_id INTEGER,
    region_code VARCHAR(5),
    area_code VARCHAR(10)
) RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'MOC-' || LPAD(card_id::TEXT, 5, '0') || '-' || region_code || '-' || area_code;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
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

-- Function to deactivate expired cards
CREATE OR REPLACE FUNCTION deactivate_expired_cards()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE cards
    SET status = 'inactive', deactivated_at = CURRENT_TIMESTAMP
    WHERE expiry_date < CURRENT_DATE AND status = 'active';

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check clinic plan limits
CREATE OR REPLACE FUNCTION check_clinic_card_limit(clinic_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    clinic_plan VARCHAR(20);
    current_cards INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT plan INTO clinic_plan FROM clinics WHERE id = clinic_uuid;
    SELECT COUNT(*) INTO current_cards FROM cards WHERE clinic_id = clinic_uuid;

    max_allowed := CASE clinic_plan
        WHEN 'starter' THEN 50
        WHEN 'growth' THEN 200
        WHEN 'pro' THEN 500
        ELSE 50
    END;

    RETURN current_cards < max_allowed;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DEFAULT DATA
-- ========================================

-- Insert default admin user (password should be changed in production)
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
-- VIEWS FOR REPORTING AND ANALYTICS
-- ========================================

-- View for active cards with clinic information
CREATE OR REPLACE VIEW active_cards_view AS
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
    cl.region AS clinic_region,
    cl.plan AS clinic_plan
FROM cards c
LEFT JOIN clinics cl ON c.clinic_id = cl.id
WHERE c.status = 'active' AND c.expiry_date >= CURRENT_DATE;

-- View for clinic statistics and dashboard
CREATE OR REPLACE VIEW clinic_dashboard_view AS
SELECT
    cl.id,
    cl.name,
    cl.code,
    cl.plan,
    cl.region,
    cl.subscription_status,
    COUNT(c.id) AS total_cards,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) AS active_cards,
    cl.max_cards,
    (cl.max_cards - COUNT(c.id)) AS available_slots,
    COUNT(a.id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) AS pending_appointments,
    COUNT(pr.id) AS total_perk_redemptions
FROM clinics cl
LEFT JOIN cards c ON cl.id = c.clinic_id
LEFT JOIN appointments a ON cl.id = a.clinic_id
LEFT JOIN perk_redemptions pr ON cl.id = pr.clinic_id
WHERE cl.is_active = true
GROUP BY cl.id, cl.name, cl.code, cl.plan, cl.region, cl.subscription_status, cl.max_cards;

-- ========================================
-- PERMISSIONS AND GRANTS
-- ========================================

-- Grant necessary permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mocards_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mocards_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mocards_app;

-- ========================================
-- SCHEMA VERSION TRACKING
-- ========================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    checksum VARCHAR(64)
);

INSERT INTO schema_migrations (version, description, checksum)
VALUES (
    '3.0.1-CORRECTED',
    'Corrected production schema for MOCARDS CLOUD - Fixed constraint syntax errors',
    'b2c3d4e5f7g8'
) ON CONFLICT (version) DO UPDATE SET
    applied_at = CURRENT_TIMESTAMP,
    description = EXCLUDED.description;

-- ========================================
-- SIMPLE DEPLOYMENT SCRIPT
-- ========================================

/*
QUICK DEPLOYMENT STEPS:

1. Create database:
   createdb mocards_production

2. Run this schema:
   psql -d mocards_production -f CORRECTED-PRODUCTION-SCHEMA.sql

3. Verify installation:
   SELECT version, applied_at FROM schema_migrations;

4. Test with sample data:
   SELECT * FROM admin_users;
   SELECT * FROM perks;

5. Change admin password immediately:
   UPDATE admin_users SET password_hash = crypt('YOUR_NEW_PASSWORD', gen_salt('bf', 12)) WHERE username = 'admin';

CONNECTION STRING EXAMPLE:
postgresql://mocards_app:SecurePassword2024!@localhost:5432/mocards_production

ENVIRONMENT VARIABLES:
DATABASE_URL=postgresql://mocards_app:SecurePassword2024!@localhost:5432/mocards_production
SESSION_SECRET=your-super-secret-key-here
ENVIRONMENT=production
VITE_API_URL=https://your-domain.com

DEPLOYMENT READY ✅
*/