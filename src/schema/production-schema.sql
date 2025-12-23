-- MOCARDS CLOUD - Production Database Schema
-- Version 3.0 - Dental Group Philippines
-- Generated: December 23, 2024

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CORE TABLES
-- ========================================

-- Cards table - Core loyalty cards
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    perks_total INTEGER DEFAULT 5 CHECK (perks_total >= 0),
    perks_used INTEGER DEFAULT 0 CHECK (perks_used >= 0 AND perks_used <= perks_total),
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinics table - Registered dental clinics
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro')),
    region VARCHAR(10) NOT NULL,
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended')),
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    max_cards INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table - Patient appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255),
    patient_phone VARCHAR(50),
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    perk_requested VARCHAR(255),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    clinic_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
    admin_notes TEXT,
    clinic_notes TEXT,
    forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Perks table - Available perks/benefits
CREATE TABLE perks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'service' CHECK (type IN ('service', 'discount', 'product', 'consultation')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Perk redemptions table - Track perk usage
CREATE TABLE perk_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_control_number VARCHAR(50) NOT NULL,
    perk_id UUID NOT NULL REFERENCES perks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table - System administrators
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Cards indexes
CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_expiry_date ON cards(expiry_date);

-- Clinics indexes
CREATE INDEX idx_clinics_code ON clinics(code);
CREATE INDEX idx_clinics_region ON clinics(region);
CREATE INDEX idx_clinics_plan ON clinics(plan);
CREATE INDEX idx_clinics_is_active ON clinics(is_active);

-- Appointments indexes
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_card_control ON appointments(card_control_number);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_preferred_date ON appointments(preferred_date);

-- Perks indexes
CREATE INDEX idx_perks_type ON perks(type);
CREATE INDEX idx_perks_is_active ON perks(is_active);

-- Perk redemptions indexes
CREATE INDEX idx_perk_redemptions_card ON perk_redemptions(card_control_number);
CREATE INDEX idx_perk_redemptions_clinic ON perk_redemptions(clinic_id);
CREATE INDEX idx_perk_redemptions_date ON perk_redemptions(redeemed_at);

-- ========================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
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
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perks_updated_at BEFORE UPDATE ON perks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DEFAULT DATA INSERTS
-- ========================================

-- Insert default admin user
INSERT INTO admin_users (username, password, is_active)
VALUES ('admin', 'admin123', true)
ON CONFLICT (username) DO NOTHING;

-- Insert default perks
INSERT INTO perks (title, description, type, is_active) VALUES
('Free Dental Consultation', 'Complimentary consultation with our dental professionals', 'consultation', true),
('10% Discount on Cleaning', '10% discount on professional teeth cleaning services', 'discount', true),
('Free Teeth Whitening Session', 'One complimentary teeth whitening treatment', 'service', true),
('Priority Appointment Booking', 'Skip the queue with priority appointment scheduling', 'service', true),
('Free Dental X-Ray', 'Complimentary dental X-ray examination', 'service', true),
('15% Off Dental Procedures', '15% discount on selected dental procedures', 'discount', true),
('Free Oral Health Package', 'Complete oral health assessment and consultation', 'service', true),
('Dental Care Kit', 'Complimentary dental care kit with toothbrush and paste', 'product', true)
ON CONFLICT DO NOTHING;

-- ========================================
-- VIEWS FOR REPORTING
-- ========================================

-- View for active cards with clinic information
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

-- View for clinic statistics
CREATE VIEW clinic_stats_view AS
SELECT
    cl.id,
    cl.name,
    cl.code,
    cl.plan,
    cl.region,
    COUNT(c.id) AS total_cards,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) AS active_cards,
    cl.max_cards,
    (cl.max_cards - COUNT(c.id)) AS available_slots
FROM clinics cl
LEFT JOIN cards c ON cl.id = c.clinic_id
WHERE cl.is_active = true
GROUP BY cl.id, cl.name, cl.code, cl.plan, cl.region, cl.max_cards;

-- View for appointment statistics
CREATE VIEW appointment_stats_view AS
SELECT
    cl.id AS clinic_id,
    cl.name AS clinic_name,
    COUNT(a.id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) AS pending_appointments,
    COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) AS confirmed_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments
FROM clinics cl
LEFT JOIN appointments a ON cl.id = a.clinic_id
WHERE cl.is_active = true
GROUP BY cl.id, cl.name;

-- ========================================
-- SECURITY POLICIES (ROW LEVEL SECURITY)
-- ========================================

-- Enable RLS on sensitive tables
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE perk_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for clinic access (clinics can only see their own data)
CREATE POLICY clinic_cards_policy ON cards
    FOR ALL TO authenticated
    USING (clinic_id = current_setting('app.current_clinic_id')::UUID);

CREATE POLICY clinic_appointments_policy ON appointments
    FOR ALL TO authenticated
    USING (clinic_id = current_setting('app.current_clinic_id')::UUID);

-- ========================================
-- PLAN LIMITS REFERENCE
-- ========================================

-- Plan limits (to be enforced in application layer)
-- Starter: 50 cards
-- Growth: 200 cards
-- Pro: 500 cards

-- ========================================
-- MAINTENANCE PROCEDURES
-- ========================================

-- Procedure to clean up expired cards
CREATE OR REPLACE FUNCTION cleanup_expired_cards()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE cards
    SET status = 'inactive'
    WHERE expiry_date < CURRENT_DATE AND status = 'active';

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Procedure to generate card control numbers
CREATE OR REPLACE FUNCTION generate_control_number(
    card_id INTEGER,
    region_code VARCHAR(5),
    area_code VARCHAR(10)
) RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'MOC-' || LPAD(card_id::TEXT, 5, '0') || '-' || region_code || '-' || area_code;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE cards IS 'Core loyalty cards issued to patients';
COMMENT ON TABLE clinics IS 'Registered dental clinics in the MOCARDS network';
COMMENT ON TABLE appointments IS 'Patient appointments scheduled through the system';
COMMENT ON TABLE perks IS 'Available perks and benefits for card holders';
COMMENT ON TABLE perk_redemptions IS 'Track when and where perks are redeemed';
COMMENT ON TABLE admin_users IS 'System administrators with full access';

COMMENT ON COLUMN cards.control_number IS 'Unique card identifier (MOC-XXXXX-REGION-AREA)';
COMMENT ON COLUMN cards.perks_total IS 'Total number of perks available on this card';
COMMENT ON COLUMN cards.perks_used IS 'Number of perks already redeemed';
COMMENT ON COLUMN clinics.max_cards IS 'Maximum number of cards this clinic can have based on their plan';
COMMENT ON COLUMN appointments.status IS 'Current status of the appointment';

-- ========================================
-- BACKUP AND RECOVERY NOTES
-- ========================================

-- Regular backup schedule recommended:
-- Daily: pg_dump -U username -h hostname -p port -d mocards_db > backup_$(date +%Y%m%d).sql
-- Weekly: Full database backup with WAL archiving
-- Monthly: Test restore procedures

-- ========================================
-- PERFORMANCE MONITORING
-- ========================================

-- Query to monitor table sizes
-- SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Query to monitor slow queries
-- SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- ========================================
-- SCHEMA VERSION AND MIGRATION TRACKING
-- ========================================

-- Schema version table for migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Insert current schema version
INSERT INTO schema_migrations (version, description)
VALUES ('3.0.0', 'Production schema for MOCARDS CLOUD - Dental Group Philippines')
ON CONFLICT (version) DO NOTHING;

-- ========================================
-- END OF SCHEMA
-- ========================================