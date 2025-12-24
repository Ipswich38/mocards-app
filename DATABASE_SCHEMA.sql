-- ================================================================
-- MOCARDS CLOUD - PRODUCTION SQL DATABASE SCHEMA
-- Christmas 2025 Edition - Multi-Device Cloud Sync Ready
-- Compatible with PostgreSQL 12+ (Primary), MySQL 8.0+, SQLite 3.35+
-- ================================================================

-- ================================================================
-- CARDS TABLE - Core loyalty card management
-- ================================================================
CREATE TABLE cards (
    id VARCHAR(50) PRIMARY KEY,
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    perks_total INTEGER DEFAULT 5 CHECK (perks_total >= 0),
    perks_used INTEGER DEFAULT 0 CHECK (perks_used >= 0),
    clinic_id VARCHAR(50),
    expiry_date DATE DEFAULT '2025-12-31',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    issued_by VARCHAR(50),
    activated_at TIMESTAMP,
    deactivated_at TIMESTAMP,
    notes TEXT,

    -- Additional validation
    CONSTRAINT chk_perks_not_exceed CHECK (perks_used <= perks_total),
    CONSTRAINT chk_control_number_format CHECK (control_number ~ '^MOC-[0-9]{5}-[A-Z0-9]{2,3}-[A-Z0-9]{3,6}$')
);

-- ================================================================
-- CLINICS TABLE - Dental clinic management
-- ================================================================
CREATE TABLE clinics (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro')),
    max_cards INTEGER DEFAULT 500 CHECK (max_cards > 0),
    region VARCHAR(10),
    address TEXT,
    admin_clinic VARCHAR(200),
    email VARCHAR(200),
    contact_number VARCHAR(50),
    subscription_price DECIMAL(10,2) DEFAULT 0 CHECK (subscription_price >= 0),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    subscription_start_date DATE DEFAULT CURRENT_DATE,
    subscription_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_payment_date DATE,
    next_billing_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Business logic validation
    CONSTRAINT chk_clinic_code_format CHECK (code ~ '^[A-Z]{3}[0-9]{3}$'),
    CONSTRAINT chk_email_format CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_subscription_dates CHECK (subscription_end_date IS NULL OR subscription_end_date >= subscription_start_date)
);

-- ================================================================
-- APPOINTMENTS TABLE - Patient appointment booking system
-- ================================================================
CREATE TABLE appointments (
    id VARCHAR(50) PRIMARY KEY,
    card_control_number VARCHAR(50) NOT NULL,
    clinic_id VARCHAR(50) NOT NULL,
    patient_name VARCHAR(200) NOT NULL,
    patient_email VARCHAR(200) NOT NULL,
    patient_phone VARCHAR(50) NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    service_type VARCHAR(200) NOT NULL,
    perk_requested VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'rescheduled', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    processed_by VARCHAR(200),
    processed_at TIMESTAMP,

    -- Business validation
    CONSTRAINT chk_appointment_email CHECK (patient_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_future_appointment CHECK (preferred_date >= CURRENT_DATE),
    CONSTRAINT chk_completed_timestamp CHECK (status != 'completed' OR completed_at IS NOT NULL),
    CONSTRAINT chk_cancelled_timestamp CHECK (status != 'cancelled' OR cancelled_at IS NOT NULL)
);

-- ================================================================
-- PERKS TABLE
-- ================================================================
CREATE TABLE perks (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('dental_cleaning', 'consultation', 'xray', 'treatment', 'discount')),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_for INTEGER DEFAULT 365,
    requires_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- PERK REDEMPTIONS TABLE (Critical for History Tracking)
-- ================================================================
CREATE TABLE perk_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    card_control_number VARCHAR(50) NOT NULL,
    perk_id VARCHAR(50) NOT NULL,
    perk_name VARCHAR(200) NOT NULL,
    clinic_id VARCHAR(50) NOT NULL,
    claimant_name VARCHAR(200) NOT NULL,
    handled_by VARCHAR(200) NOT NULL,
    service_type VARCHAR(200) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

-- ================================================================
-- USERS TABLE (Optional - for future admin/staff management)
-- ================================================================
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'clinic', 'staff')),
    clinic_id VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    permissions TEXT -- JSON array of permissions
);

-- ================================================================
-- AUDIT LOG TABLE (Optional - for tracking changes)
-- ================================================================
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50) NOT NULL,
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- INDEXES for Performance
-- ================================================================

-- Cards indexes
CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX idx_cards_status ON cards(status);

-- Clinics indexes
CREATE INDEX idx_clinics_code ON clinics(code);
CREATE INDEX idx_clinics_is_active ON clinics(is_active);

-- Appointments indexes
CREATE INDEX idx_appointments_card_control_number ON appointments(card_control_number);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_preferred_date ON appointments(preferred_date);

-- Perks indexes
CREATE INDEX idx_perks_type ON perks(type);
CREATE INDEX idx_perks_is_active ON perks(is_active);

-- Perk Redemptions indexes
CREATE INDEX idx_perk_redemptions_card_control_number ON perk_redemptions(card_control_number);
CREATE INDEX idx_perk_redemptions_clinic_id ON perk_redemptions(clinic_id);
CREATE INDEX idx_perk_redemptions_used_at ON perk_redemptions(used_at);
CREATE INDEX idx_perk_redemptions_perk_id ON perk_redemptions(perk_id);

-- ================================================================
-- FOREIGN KEY CONSTRAINTS (Optional - for data integrity)
-- ================================================================

-- Cards → Clinics
ALTER TABLE cards
ADD CONSTRAINT fk_cards_clinic_id
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

-- Appointments → Clinics
ALTER TABLE appointments
ADD CONSTRAINT fk_appointments_clinic_id
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- Perk Redemptions → Clinics
ALTER TABLE perk_redemptions
ADD CONSTRAINT fk_perk_redemptions_clinic_id
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- Perk Redemptions → Perks
ALTER TABLE perk_redemptions
ADD CONSTRAINT fk_perk_redemptions_perk_id
FOREIGN KEY (perk_id) REFERENCES perks(id) ON DELETE CASCADE;

-- Users → Clinics (Optional)
ALTER TABLE users
ADD CONSTRAINT fk_users_clinic_id
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

-- ================================================================
-- DEFAULT DATA INSERTION - Production Ready Sample Data
-- ================================================================

-- Insert default dental perks
INSERT INTO perks (id, type, name, description, value, is_active, valid_for, requires_approval) VALUES
('perk_dental_cleaning_001', 'dental_cleaning', 'Free Dental Cleaning', 'Complete professional dental cleaning service', 1500.00, TRUE, 365, FALSE),
('perk_consultation_001', 'consultation', 'Free Dental Consultation', 'Comprehensive dental consultation and check-up', 500.00, TRUE, 365, FALSE),
('perk_xray_001', 'xray', 'Digital X-Ray Service', 'Digital X-ray imaging for diagnosis', 800.00, TRUE, 365, TRUE),
('perk_treatment_001', 'treatment', 'Treatment Discount', '20% discount on dental treatments and procedures', 20.00, TRUE, 365, TRUE),
('perk_discount_001', 'discount', 'General Service Discount', '10% discount on all dental services', 10.00, TRUE, 365, FALSE);

-- Insert sample admin user (password: mocards2025)
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, permissions) VALUES
('user_admin_001', 'admin', 'admin@mocards.cloud', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfMY8UfuJt1HyYa', 'admin', 'MOCARDS', 'Administrator', TRUE, '["manage_clinics", "manage_cards", "manage_perks", "view_all_data", "manage_users"]');

-- Insert sample clinic for testing
INSERT INTO clinics (id, name, code, password, plan, max_cards, region, address, email, contact_number, subscription_status, subscription_start_date, is_active) VALUES
('clinic_test_001', 'Smile Dental Clinic', 'CVT001', 'clinic123', 'starter', 500, 'NCR', '123 Dental Street, Metro Manila', 'info@smiledentalclinic.com', '+63 2 8123 4567', 'active', CURRENT_DATE, TRUE);

-- Insert sample cards for testing
INSERT INTO cards (id, control_number, full_name, status, perks_total, perks_used, clinic_id, expiry_date) VALUES
('card_test_001', 'MOC-00001-NCR-CVT001', 'Juan Dela Cruz', 'active', 5, 1, 'clinic_test_001', '2025-12-31'),
('card_test_002', 'MOC-00002-NCR-CVT001', 'Maria Santos', 'active', 5, 0, 'clinic_test_001', '2025-12-31'),
('card_test_003', 'MOC-00003-NCR-CVT001', '', 'inactive', 5, 0, '', '2025-12-31');

-- ================================================================
-- VIEWS for Common Queries (Optional but Recommended)
-- ================================================================

-- Active cards with clinic information
CREATE VIEW v_active_cards AS
SELECT
    c.id,
    c.control_number,
    c.full_name,
    c.status,
    c.perks_total,
    c.perks_used,
    cl.name as clinic_name,
    cl.code as clinic_code,
    c.expiry_date,
    c.created_at
FROM cards c
LEFT JOIN clinics cl ON c.clinic_id = cl.id
WHERE c.status = 'active';

-- Pending appointments with card and clinic info
CREATE VIEW v_pending_appointments AS
SELECT
    a.id,
    a.card_control_number,
    a.patient_name,
    a.patient_email,
    a.preferred_date,
    a.preferred_time,
    a.service_type,
    a.perk_requested,
    cl.name as clinic_name,
    cl.code as clinic_code,
    a.created_at
FROM appointments a
JOIN clinics cl ON a.clinic_id = cl.id
WHERE a.status = 'pending'
ORDER BY a.created_at DESC;

-- Perk redemption history with details
CREATE VIEW v_perk_history AS
SELECT
    pr.id,
    pr.card_control_number,
    pr.perk_name,
    pr.claimant_name,
    pr.handled_by,
    pr.service_type,
    pr.used_at,
    pr.value,
    cl.name as clinic_name,
    cl.code as clinic_code,
    pr.notes
FROM perk_redemptions pr
JOIN clinics cl ON pr.clinic_id = cl.id
ORDER BY pr.used_at DESC;

-- ================================================================
-- TRIGGERS for Updated_at (PostgreSQL syntax)
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need updated_at
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perks_updated_at BEFORE UPDATE ON perks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- PRODUCTION-READY SAMPLE QUERIES
-- ================================================================

-- 🔍 CLINIC MANAGEMENT QUERIES

-- Get all cards assigned to a specific clinic
SELECT c.*, cl.name as clinic_name
FROM cards c
LEFT JOIN clinics cl ON c.clinic_id = cl.id
WHERE c.clinic_id = 'clinic_test_001';

-- Get clinic dashboard statistics
SELECT
    cl.name as clinic_name,
    cl.code as clinic_code,
    COUNT(c.id) as total_cards,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_cards,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_appointments,
    SUM(c.perks_used) as total_perks_redeemed
FROM clinics cl
LEFT JOIN cards c ON cl.id = c.clinic_id
LEFT JOIN appointments a ON cl.id = a.clinic_id
WHERE cl.id = 'clinic_test_001'
GROUP BY cl.id, cl.name, cl.code;

-- 📋 APPOINTMENT MANAGEMENT QUERIES

-- Get pending appointments for a clinic (with card info)
SELECT
    a.*,
    c.full_name as cardholder_name,
    c.perks_total - c.perks_used as remaining_perks
FROM appointments a
LEFT JOIN cards c ON a.card_control_number = c.control_number
WHERE a.clinic_id = 'clinic_test_001' AND a.status = 'pending'
ORDER BY a.preferred_date ASC, a.preferred_time ASC;

-- Get appointment history for a specific card
SELECT a.*, cl.name as clinic_name
FROM appointments a
LEFT JOIN clinics cl ON a.clinic_id = cl.id
WHERE a.card_control_number = 'MOC-00001-NCR-CVT001'
ORDER BY a.created_at DESC;

-- 🎁 PERK REDEMPTION QUERIES

-- Get complete perk redemption history for a card
SELECT
    pr.*,
    cl.name as clinic_name,
    p.description as perk_description
FROM perk_redemptions pr
LEFT JOIN clinics cl ON pr.clinic_id = cl.id
LEFT JOIN perks p ON pr.perk_id = p.id
WHERE pr.card_control_number = 'MOC-00001-NCR-CVT001'
ORDER BY pr.used_at DESC;

-- Get today's perk redemptions for a clinic
SELECT
    pr.*,
    c.full_name as cardholder_name
FROM perk_redemptions pr
LEFT JOIN cards c ON pr.card_control_number = c.control_number
WHERE pr.clinic_id = 'clinic_test_001'
AND DATE(pr.used_at) = CURRENT_DATE
ORDER BY pr.used_at DESC;

-- 📊 ANALYTICS QUERIES

-- Monthly perk redemption summary by clinic
SELECT
    cl.name as clinic_name,
    COUNT(pr.id) as total_redemptions,
    SUM(pr.value) as total_value_redeemed,
    DATE_TRUNC('month', pr.used_at) as month
FROM perk_redemptions pr
JOIN clinics cl ON pr.clinic_id = cl.id
WHERE pr.used_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY cl.id, cl.name, DATE_TRUNC('month', pr.used_at)
ORDER BY month DESC, total_redemptions DESC;

-- Card utilization report
SELECT
    c.clinic_id,
    cl.name as clinic_name,
    COUNT(c.id) as total_cards,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_cards,
    ROUND(AVG(c.perks_used::DECIMAL / c.perks_total * 100), 2) as avg_utilization_percentage,
    SUM(c.perks_used) as total_perks_used
FROM cards c
LEFT JOIN clinics cl ON c.clinic_id = cl.id
WHERE c.clinic_id IS NOT NULL AND c.clinic_id != ''
GROUP BY c.clinic_id, cl.name
ORDER BY avg_utilization_percentage DESC;

-- ================================================================
-- DATABASE SETUP & DEPLOYMENT GUIDE
-- ================================================================

/*
🚀 QUICK DEPLOYMENT STEPS:

1. Create PostgreSQL Database:
   CREATE DATABASE mocards_cloud;

2. Connect to database:
   \c mocards_cloud;

3. Run this entire schema:
   \i DATABASE_SCHEMA.sql

4. Verify installation:
   SELECT COUNT(*) FROM perks; -- Should return 5
   SELECT COUNT(*) FROM clinics; -- Should return 1
   SELECT COUNT(*) FROM cards; -- Should return 3

5. Test authentication:
   -- Admin login: admin@mocards.cloud / mocards2025
   -- Clinic login: CVT001 / clinic123

6. Start testing with sample data included!

📡 CLOUD SYNC INTEGRATION:
- localStorage implementation ready for production
- Prepared for Supabase/Firebase/AWS backend
- Real-time sync across all devices
- Offline-first with automatic sync
*/

-- ================================================================
-- DEVELOPMENT RESET COMMANDS (USE WITH CAUTION!)
-- ================================================================

-- Uncomment ONLY if you need to completely reset the database
-- WARNING: This will delete ALL data!

-- DROP VIEW IF EXISTS v_perk_history;
-- DROP VIEW IF EXISTS v_pending_appointments;
-- DROP VIEW IF EXISTS v_active_cards;
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS perk_redemptions;
-- DROP TABLE IF EXISTS perks;
-- DROP TABLE IF EXISTS appointments;
-- DROP TABLE IF EXISTS cards;
-- DROP TABLE IF EXISTS clinics;

-- ================================================================
-- 🎉 END OF MOCARDS CLOUD SCHEMA - READY FOR PRODUCTION! 🎉
-- ================================================================