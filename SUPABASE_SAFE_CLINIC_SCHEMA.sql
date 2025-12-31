-- ===============================================
-- SAFE CLINIC MANAGEMENT SCHEMA - INCREMENTAL UPDATE
-- ===============================================
-- This script safely adds only the missing clinic management functionality
-- WITHOUT dropping existing tables or data

-- ===============================================
-- STEP 1: ENSURE CLINICS TABLE EXISTS
-- ===============================================

-- Create clinics table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clinics (
    -- Primary identification
    id SERIAL PRIMARY KEY,
    clinic_uuid UUID DEFAULT gen_random_uuid() UNIQUE,

    -- Basic clinic info (matching ClinicManagementApp)
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(50) NOT NULL,
    plan VARCHAR(20) DEFAULT 'starter',
    code VARCHAR(20) UNIQUE NOT NULL,
    area_code VARCHAR(10),
    custom_area_code VARCHAR(10),

    -- Contact information
    address TEXT,
    admin_clinic VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(20),

    -- Security
    password_hash TEXT NOT NULL,

    -- Status and limits
    subscription_status VARCHAR(20) DEFAULT 'active',
    max_cards_allowed INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    cards_generated_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- STEP 2: ADD MISSING COLUMNS TO EXISTING CLINICS TABLE
-- ===============================================

-- Add columns that might be missing (safe - will skip if already exists)
DO $$
BEGIN
    -- Add area_code if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN area_code VARCHAR(10);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add custom_area_code if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN custom_area_code VARCHAR(10);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add plan if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN plan VARCHAR(20) DEFAULT 'starter';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add max_cards_allowed if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN max_cards_allowed INTEGER DEFAULT 100;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add cards_generated_count if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN cards_generated_count INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add clinic_uuid if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN clinic_uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add subscription_status if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add updated_at if missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    RAISE NOTICE '✅ Clinic table columns updated successfully';
END $$;

-- ===============================================
-- STEP 3: CREATE BASIC INDEXES (SAFE)
-- ===============================================

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_clinics_username ON public.clinics(username);
CREATE INDEX IF NOT EXISTS idx_clinics_code ON public.clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_region ON public.clinics(region);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON public.clinics(is_active);

-- ===============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (SAFE)
-- ===============================================

-- Enable RLS (safe - won't fail if already enabled)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (safe)
DO $$
BEGIN
    -- Create policy for public read access
    CREATE POLICY "Public read access for clinics" ON public.clinics
        FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Create policy for admin management
    CREATE POLICY "Admin can manage clinics" ON public.clinics
        FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ===============================================
-- STEP 5: INSERT TEST CLINIC DATA (SAFE)
-- ===============================================

-- Insert a test clinic only if no clinics exist
INSERT INTO public.clinics (
    name, username, region, plan, code, area_code,
    address, email, contact_number, password_hash,
    subscription_status, max_cards_allowed, is_active
)
SELECT
    'Enterprise Test Clinic',
    'enterprise_admin',
    'NCR',
    'pro',
    'ENT001',
    'NCR-01',
    '123 Enterprise Street, Manila',
    'admin@enterprise-clinic.com',
    '+63-2-8123-4567',
    'enterprise_password_2024',
    'active',
    1000,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.clinics);

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Show clinic table structure
SELECT '🏗️ CLINICS TABLE STRUCTURE:' as "INFO";
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clinics' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show existing clinics
SELECT '📋 EXISTING CLINICS:' as "INFO";
SELECT id, name, username, region, plan, code, is_active, created_at
FROM public.clinics
ORDER BY created_at;

-- Connection test
SELECT '✅ DATABASE CONNECTION TEST PASSED!' as "STATUS";
SELECT COUNT(*) as "Total Clinics" FROM public.clinics;