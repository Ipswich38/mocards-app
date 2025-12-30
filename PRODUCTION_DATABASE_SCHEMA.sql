-- ===============================================
-- MOCARDS ENTERPRISE PRODUCTION DATABASE SCHEMA
-- ===============================================
-- Complete schema for enterprise multi-tenant deployment
-- Includes cloud isolation, security, and audit features
-- Version: 2.0 (Modular Architecture)
-- Last Updated: 2024-12-30

-- ===============================================
-- STEP 1: EXTENSIONS AND INITIAL SETUP
-- ===============================================

-- Enable necessary extensions for enterprise features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create feature-based schemas for organization
CREATE SCHEMA IF NOT EXISTS auth_mgmt;
CREATE SCHEMA IF NOT EXISTS cards;
CREATE SCHEMA IF NOT EXISTS clinics;
CREATE SCHEMA IF NOT EXISTS appointments;
CREATE SCHEMA IF NOT EXISTS perks;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set schema search path for better organization
ALTER DATABASE postgres SET search_path = public, auth_mgmt, cards, clinics, appointments, perks, analytics, audit;

-- ===============================================
-- STEP 2: AUDIT SYSTEM
-- ===============================================

-- Create audit trigger function for all data changes
CREATE OR REPLACE FUNCTION audit.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit.audit_log (
        table_name,
        operation,
        old_data,
        new_data,
        user_id,
        timestamp,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        auth.uid(),
        NOW(),
        inet_client_addr()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table with advanced security
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can see audit logs
CREATE POLICY "audit_log_super_admin_only" ON audit.audit_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

-- ===============================================
-- STEP 3: AUTHENTICATION SCHEMA
-- ===============================================

-- User profiles table with advanced security
CREATE TABLE IF NOT EXISTS auth_mgmt.user_profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'clinic', 'user')),
    clinic_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE auth_mgmt.user_profiles ENABLE ROW LEVEL SECURITY;

-- User sessions for advanced session management
CREATE TABLE IF NOT EXISTS auth_mgmt.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth_mgmt.user_profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auth_mgmt.user_sessions ENABLE ROW LEVEL SECURITY;

-- Security events for monitoring
CREATE TABLE IF NOT EXISTS auth_mgmt.security_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth_mgmt.user_profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login', 'password_change', 'account_locked', 'suspicious_activity')),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auth_mgmt.security_events ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- STEP 4: CLINICS SCHEMA
-- ===============================================

-- Clinic plans and pricing
CREATE TABLE IF NOT EXISTS clinics.clinic_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    max_cards INTEGER NOT NULL,
    max_clinics INTEGER NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinics table with enhanced security
CREATE TABLE IF NOT EXISTS clinics.clinics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- Clinic access code
    email TEXT UNIQUE NOT NULL,
    contact_number TEXT NOT NULL,
    address TEXT NOT NULL,
    region TEXT NOT NULL,
    plan_id UUID REFERENCES clinics.clinic_plans(id),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    subscription_expires TIMESTAMP WITH TIME ZONE,
    tenant_id UUID DEFAULT uuid_generate_v4(), -- For multi-tenant isolation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Clinic settings for customization
CREATE TABLE IF NOT EXISTS clinics.clinic_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics.clinics(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(clinic_id, setting_key)
);

-- Clinic staff management
CREATE TABLE IF NOT EXISTS clinics.clinic_staff (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth_mgmt.user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'viewer')),
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    hired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(clinic_id, user_id)
);

-- Enable RLS
ALTER TABLE clinics.clinic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics.clinic_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist (for fresh setup)
-- WARNING: Only run this if you want to reset all data!
-- DROP TABLE IF EXISTS cards CASCADE;
-- DROP TABLE IF EXISTS clinics CASCADE;

-- MOCARDS CLINIC TABLE - Updated with Username System
CREATE TABLE IF NOT EXISTS clinics (
    id VARCHAR(50) PRIMARY KEY,
    clinic_name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    region VARCHAR(10) NOT NULL,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('starter', 'growth', 'pro')),
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    subscription_price INTEGER NOT NULL,
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    subscription_start_date TIMESTAMPTZ NOT NULL,
    subscription_end_date TIMESTAMPTZ,
    max_cards INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_payment_date TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- MOCARDS CARDS TABLE
CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(50) PRIMARY KEY,
    control_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    perks_total INTEGER DEFAULT 5,
    perks_used INTEGER DEFAULT 0,
    clinic_id VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    issued_by VARCHAR(50),
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    notes TEXT,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
);

-- APPOINTMENTS TABLE (matches Supabase schema)
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(50) PRIMARY KEY,
    control_number VARCHAR(50) NOT NULL,
    assigned_clinic_id VARCHAR(50),
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255),
    patient_phone VARCHAR(50),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    perk_type VARCHAR(255),
    status VARCHAR(20) DEFAULT 'waiting_for_approval' CHECK (status IN ('waiting_for_approval', 'approved', 'declined', 'rescheduled', 'completed', 'cancelled')),
    cardholder_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    processed_by VARCHAR(50),
    processed_at TIMESTAMPTZ,
    FOREIGN KEY (assigned_clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- PERKS TABLE
CREATE TABLE IF NOT EXISTS perks (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_for INTEGER DEFAULT 365,
    requires_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERK REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS perk_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    card_control_number VARCHAR(50) NOT NULL,
    perk_id VARCHAR(50) NOT NULL,
    perk_name VARCHAR(255) NOT NULL,
    clinic_id VARCHAR(50) NOT NULL,
    claimant_name VARCHAR(255) NOT NULL,
    handled_by VARCHAR(255) NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL,
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (perk_id) REFERENCES perks(id) ON DELETE CASCADE
);

-- Performance Indexes for Clinics
CREATE INDEX IF NOT EXISTS idx_clinics_username ON clinics(username);
CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_region ON clinics(region);
CREATE INDEX IF NOT EXISTS idx_clinics_plan ON clinics(plan);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(subscription_status);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active);

-- Performance Indexes for Cards
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_expiry_date ON cards(expiry_date);

-- Performance Indexes for Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(assigned_clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_card_number ON appointments(control_number);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);

-- Performance Indexes for Perk Redemptions
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card_number ON perk_redemptions(card_control_number);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_id ON perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk_id ON perk_redemptions(perk_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_used_at ON perk_redemptions(used_at);

-- Insert Default Perks (Production Ready)
INSERT INTO perks (id, type, name, description, value, is_active, valid_for, requires_approval) VALUES
    ('perk_dental_cleaning', 'dental_cleaning', 'Free Dental Cleaning', 'Complete professional dental cleaning service', 1500.00, true, 365, false),
    ('perk_consultation', 'consultation', 'Free Dental Consultation', 'Comprehensive dental consultation and check-up', 500.00, true, 365, false),
    ('perk_xray', 'xray', 'X-Ray Imaging Service', 'Digital X-ray imaging for diagnosis', 800.00, true, 365, true),
    ('perk_treatment_discount', 'treatment', 'Treatment Discount', '20% discount on dental treatments and procedures', 20.00, true, 365, true),
    ('perk_general_discount', 'discount', 'General Service Discount', '10% discount on all dental services', 10.00, true, 365, false)
ON CONFLICT (id) DO NOTHING;

-- Insert Demo Clinic for Testing (Remove for production)
INSERT INTO clinics (
    id, clinic_name, username, code, region, plan, address, admin_clinic,
    email, contact_number, password_hash, subscription_price, subscription_status,
    subscription_start_date, max_cards
) VALUES (
    'clinic_demo_001',
    'Demo Dental Clinic',
    'demo',
    'CVT001',
    '4A',
    'starter',
    '123 Dental Street, Batangas City',
    'Dr. Demo Dentist',
    'demo@dental.com',
    '+63917123456',
    'demo123',
    299,
    'active',
    NOW(),
    500
) ON CONFLICT (id) DO NOTHING;

-- Verify Schema Creation
SELECT 'SCHEMA CREATION COMPLETE' as status;

-- Show table structures
SELECT 'CLINICS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clinics' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CARDS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cards' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show demo data
SELECT 'DEMO CLINIC CREATED:' as info;
SELECT
    id,
    clinic_name,
    username as login_username,
    code as area_code,
    region,
    plan,
    subscription_status
FROM clinics
WHERE id = 'clinic_demo_001';

SELECT 'PRODUCTION DATABASE READY!' as success_message;
SELECT 'Login: username=demo, password=demo123' as login_info;
SELECT 'Area code CVT001 for card generation' as card_info;