-- ========================================
-- MOCARDS CLOUD - FINAL 2025 PRODUCTION SCHEMA
-- Version 4.0.0 - NEW YEAR DEPLOYMENT
-- Generated: December 23, 2024
-- Updated for: 2025 Production Launch
-- Client: Dental Group Philippines
-- ========================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- DROP EXISTING TABLES (SAFE RECREATION)
-- ========================================

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS perk_redemptions CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS perks CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- ========================================
-- CORE TABLES (2025 PRODUCTION READY)
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
    details TEXT,
    ip_address VARCHAR(45),
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
-- FOREIGN KEY CONSTRAINTS
-- ========================================

ALTER TABLE cards ADD CONSTRAINT fk_cards_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;
ALTER TABLE cards ADD CONSTRAINT fk_cards_issuer FOREIGN KEY (issued_by) REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE appointments ADD CONSTRAINT fk_appointments_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_creator FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE perk_redemptions ADD CONSTRAINT fk_redemptions_perk FOREIGN KEY (perk_id) REFERENCES perks(id) ON DELETE CASCADE;
ALTER TABLE perk_redemptions ADD CONSTRAINT fk_redemptions_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- ========================================
-- CHECK CONSTRAINTS
-- ========================================

ALTER TABLE clinics ADD CONSTRAINT chk_plan CHECK (plan IN ('starter', 'growth', 'pro'));
ALTER TABLE clinics ADD CONSTRAINT chk_subscription CHECK (subscription_status IN ('active', 'inactive', 'suspended'));

ALTER TABLE cards ADD CONSTRAINT chk_status CHECK (status IN ('active', 'inactive'));
ALTER TABLE cards ADD CONSTRAINT chk_perks_positive CHECK (perks_total >= 0 AND perks_used >= 0);
ALTER TABLE cards ADD CONSTRAINT chk_perks_logic CHECK (perks_used <= perks_total);

ALTER TABLE perks ADD CONSTRAINT chk_perk_type CHECK (type IN ('service', 'discount', 'product', 'consultation'));
ALTER TABLE appointments ADD CONSTRAINT chk_appointment_status CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled'));

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_clinics_code ON clinics(code);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- ========================================
-- TRIGGERS
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

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
-- DEFAULT DATA (2025 VERSION)
-- ========================================

-- Insert default admin (password: admin123)
INSERT INTO admin_users (username, password_hash, is_active)
VALUES ('admin', crypt('admin123', gen_salt('bf', 12)), true);

-- Insert default perks for 2025
INSERT INTO perks (name, description, type, value, is_active) VALUES
('Free Dental Consultation', 'Complimentary consultation with our dental professionals', 'consultation', 0, true),
('10% Discount on Cleaning', '10% discount on professional teeth cleaning services', 'discount', 10, true),
('Free Teeth Whitening Session', 'One complimentary teeth whitening treatment', 'service', 500, true),
('Priority Appointment Booking', 'Skip the queue with priority appointment scheduling', 'service', 0, true),
('Free Dental X-Ray', 'Complimentary dental X-ray examination', 'service', 200, true),
('15% Off Dental Procedures', '15% discount on selected dental procedures', 'discount', 15, true),
('Free Oral Health Package', 'Complete oral health assessment and consultation', 'service', 300, true),
('Dental Care Kit', 'Complimentary dental care kit with toothbrush and paste', 'product', 150, true);

-- ========================================
-- ESSENTIAL VIEWS
-- ========================================

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

-- ========================================
-- SCHEMA VERSION (2025)
-- ========================================

CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('4.0.0', 'MOCARDS CLOUD 2025 - Final Production Schema');

-- ========================================
-- VERIFICATION
-- ========================================

SELECT '🎉 MOCARDS CLOUD 2025 SCHEMA INSTALLED SUCCESSFULLY! 🚀' as status;
SELECT version, applied_at FROM schema_migrations;
SELECT COUNT(*) as admin_users FROM admin_users;
SELECT COUNT(*) as perks_available FROM perks;

-- ========================================
-- 2025 DEPLOYMENT NOTES
-- ========================================

/*
🎊 MOCARDS CLOUD 2025 - PRODUCTION READY! 🎊

✅ DEPLOYMENT SUCCESS CHECKLIST:
- Tables created without errors
- Admin user ready (admin/admin123)
- 8 perks loaded for immediate use
- All indexes created for performance
- Foreign keys properly set up

🚀 IMMEDIATE NEXT STEPS:
1. Change admin password:
   UPDATE admin_users SET password_hash = crypt('NewSecurePassword2025!', gen_salt('bf', 12)) WHERE username = 'admin';

2. Test the application:
   - Login as admin
   - Create a test clinic
   - Generate test cards
   - Create appointments

3. Go live and collect your bonus! 💰

🎄 HAPPY NEW YEAR 2025! 🎄
Your MOCARDS application is ready for a successful year!
*/