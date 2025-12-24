-- ================================================================
-- MOCARDS CLOUD - PRODUCTION SQL DATABASE SCHEMA (SAFE VERSION)
-- Christmas 2025 Edition - Multi-Device Cloud Sync Ready
-- Compatible with PostgreSQL 12+ (Primary), MySQL 8.0+, SQLite 3.35+
-- ================================================================

-- This version safely handles existing tables and data
-- Use this when you already have tables created

-- ================================================================
-- CARDS TABLE - Core loyalty card management
-- ================================================================
CREATE TABLE IF NOT EXISTS cards (
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
    notes TEXT
);

-- Add constraints only if they don't exist
DO $$
BEGIN
    -- Add perks validation constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_perks_not_exceed'
        AND table_name = 'cards'
    ) THEN
        ALTER TABLE cards ADD CONSTRAINT chk_perks_not_exceed CHECK (perks_used <= perks_total);
    END IF;

    -- Add control number format constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_control_number_format'
        AND table_name = 'cards'
    ) THEN
        ALTER TABLE cards ADD CONSTRAINT chk_control_number_format CHECK (control_number ~ '^MOC-[0-9]{5}-[A-Z0-9]{2,3}-[A-Z0-9]{3,6}$');
    END IF;
END $$;

-- ================================================================
-- CLINICS TABLE - Dental clinic management
-- ================================================================
CREATE TABLE IF NOT EXISTS clinics (
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
    is_active BOOLEAN DEFAULT TRUE
);

-- Add clinic constraints safely
DO $$
BEGIN
    -- Add clinic code format constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_clinic_code_format'
        AND table_name = 'clinics'
    ) THEN
        ALTER TABLE clinics ADD CONSTRAINT chk_clinic_code_format CHECK (code ~ '^[A-Z]{3}[0-9]{3}$');
    END IF;

    -- Add email format constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_email_format'
        AND table_name = 'clinics'
    ) THEN
        ALTER TABLE clinics ADD CONSTRAINT chk_email_format CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;

    -- Add subscription dates constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_subscription_dates'
        AND table_name = 'clinics'
    ) THEN
        ALTER TABLE clinics ADD CONSTRAINT chk_subscription_dates CHECK (subscription_end_date IS NULL OR subscription_end_date >= subscription_start_date);
    END IF;
END $$;

-- ================================================================
-- APPOINTMENTS TABLE - Patient appointment booking system
-- ================================================================
CREATE TABLE IF NOT EXISTS appointments (
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
    processed_at TIMESTAMP
);

-- ================================================================
-- PERKS TABLE - Dental benefit definitions
-- ================================================================
CREATE TABLE IF NOT EXISTS perks (
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
-- PERK REDEMPTIONS TABLE - Critical for History Tracking
-- ================================================================
CREATE TABLE IF NOT EXISTS perk_redemptions (
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
-- USERS TABLE - Admin/staff management
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
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
    permissions TEXT
);

-- ================================================================
-- AUDIT LOG TABLE - Change tracking
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50) NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- INDEXES for Performance (Create only if they don't exist)
-- ================================================================

-- Cards indexes
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);

-- Clinics indexes
CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON clinics(is_active);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_card_control_number ON appointments(card_control_number);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_preferred_date ON appointments(preferred_date);

-- Perks indexes
CREATE INDEX IF NOT EXISTS idx_perks_type ON perks(type);
CREATE INDEX IF NOT EXISTS idx_perks_is_active ON perks(is_active);

-- Perk Redemptions indexes
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card_control_number ON perk_redemptions(card_control_number);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_id ON perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_used_at ON perk_redemptions(used_at);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk_id ON perk_redemptions(perk_id);

-- ================================================================
-- SAFE DEFAULT DATA INSERTION - Only inserts if data doesn't exist
-- ================================================================

-- Insert default dental perks (only if they don't exist)
INSERT INTO perks (id, type, name, description, value, is_active, valid_for, requires_approval)
SELECT * FROM (VALUES
    ('perk_dental_cleaning_001', 'dental_cleaning', 'Free Dental Cleaning', 'Complete professional dental cleaning service', 1500.00, TRUE, 365, FALSE),
    ('perk_consultation_001', 'consultation', 'Free Dental Consultation', 'Comprehensive dental consultation and check-up', 500.00, TRUE, 365, FALSE),
    ('perk_xray_001', 'xray', 'Digital X-Ray Service', 'Digital X-ray imaging for diagnosis', 800.00, TRUE, 365, TRUE),
    ('perk_treatment_001', 'treatment', 'Treatment Discount', '20% discount on dental treatments and procedures', 20.00, TRUE, 365, TRUE),
    ('perk_discount_001', 'discount', 'General Service Discount', '10% discount on all dental services', 10.00, TRUE, 365, FALSE)
) AS v(id, type, name, description, value, is_active, valid_for, requires_approval)
WHERE NOT EXISTS (SELECT 1 FROM perks WHERE perks.id = v.id);

-- Insert sample admin user (only if it doesn't exist)
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, permissions)
SELECT * FROM (VALUES
    ('user_admin_001', 'admin', 'admin@mocards.cloud', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfMY8UfuJt1HyYa', 'admin', 'MOCARDS', 'Administrator', TRUE, '["manage_clinics", "manage_cards", "manage_perks", "view_all_data", "manage_users"]')
) AS v(id, username, email, password_hash, role, first_name, last_name, is_active, permissions)
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = v.id);

-- Insert sample clinic (only if it doesn't exist)
INSERT INTO clinics (id, name, code, password, plan, max_cards, region, address, email, contact_number, subscription_status, subscription_start_date, is_active)
SELECT * FROM (VALUES
    ('clinic_test_001', 'Smile Dental Clinic', 'CVT001', 'clinic123', 'starter', 500, 'NCR', '123 Dental Street, Metro Manila', 'info@smiledentalclinic.com', '+63 2 8123 4567', 'active', CURRENT_DATE, TRUE)
) AS v(id, name, code, password, plan, max_cards, region, address, email, contact_number, subscription_status, subscription_start_date, is_active)
WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE clinics.id = v.id);

-- Insert sample cards (only if they don't exist)
INSERT INTO cards (id, control_number, full_name, status, perks_total, perks_used, clinic_id, expiry_date)
SELECT * FROM (VALUES
    ('card_test_001', 'MOC-00001-NCR-CVT001', 'Juan Dela Cruz', 'active', 5, 1, 'clinic_test_001', '2025-12-31'),
    ('card_test_002', 'MOC-00002-NCR-CVT001', 'Maria Santos', 'active', 5, 0, 'clinic_test_001', '2025-12-31'),
    ('card_test_003', 'MOC-00003-NCR-CVT001', '', 'inactive', 5, 0, '', '2025-12-31')
) AS v(id, control_number, full_name, status, perks_total, perks_used, clinic_id, expiry_date)
WHERE NOT EXISTS (SELECT 1 FROM cards WHERE cards.id = v.id);

-- ================================================================
-- VERIFICATION QUERIES - Run these to confirm everything worked
-- ================================================================

-- Check if data was inserted correctly
SELECT 'Perks Count' as check_type, COUNT(*) as count FROM perks
UNION ALL
SELECT 'Clinics Count' as check_type, COUNT(*) as count FROM clinics
UNION ALL
SELECT 'Cards Count' as check_type, COUNT(*) as count FROM cards
UNION ALL
SELECT 'Users Count' as check_type, COUNT(*) as count FROM users;

-- Show sample data
SELECT 'Sample Clinic Data:' as info;
SELECT name, code, plan, max_cards FROM clinics WHERE id = 'clinic_test_001';

SELECT 'Sample Card Data:' as info;
SELECT control_number, full_name, status, perks_total, perks_used FROM cards WHERE clinic_id = 'clinic_test_001';

-- ================================================================
-- 🎉 SUCCESS! SAFE SCHEMA UPDATE COMPLETE 🎉
-- ================================================================