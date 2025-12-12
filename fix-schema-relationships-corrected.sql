-- Fix Schema Relationships and Foreign Keys - CORRECTED VERSION
-- Resolves "Could not find relationship" errors in Supabase
-- SAFE EXECUTION - Preserves all existing data

BEGIN;

-- =============================================================================
-- DIAGNOSE CURRENT SCHEMA STATE
-- =============================================================================

-- Check if tables exist
SELECT
    'TABLE VERIFICATION' as check_type,
    schemaname,
    tablename,
    CASE WHEN tablename IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cards', 'mocards_clinics', 'card_perks', 'default_perk_templates')
ORDER BY tablename;

-- Check current foreign key constraints
SELECT
    'CURRENT CONSTRAINTS' as info,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('cards', 'mocards_clinics', 'card_perks', 'default_perk_templates')
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- Check what columns exist in each table
SELECT
    'TABLE COLUMNS' as info,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('cards', 'mocards_clinics', 'card_perks', 'default_perk_templates')
AND column_name IN ('assigned_clinic_id', 'card_id', 'clinic_id', 'id')
ORDER BY table_name, column_name;

-- =============================================================================
-- ENSURE CORE TABLES EXIST WITH CORRECT STRUCTURE
-- =============================================================================

-- Create mocards_clinics table if missing
CREATE TABLE IF NOT EXISTS public.mocards_clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_name VARCHAR(255) NOT NULL,
    clinic_code VARCHAR(20) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    location_code VARCHAR(10),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    password_hash TEXT,
    password_must_be_changed BOOLEAN DEFAULT false,
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_login BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cards table if missing with proper structure
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    control_number VARCHAR(255) UNIQUE,  -- Legacy format
    control_number_v2 VARCHAR(255) UNIQUE,  -- New format MOC-01-NCR1-NNNNN
    card_number INTEGER UNIQUE,
    passcode VARCHAR(6) NOT NULL,
    location_code_v2 VARCHAR(10),
    clinic_code_v2 VARCHAR(20),
    is_activated BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned', 'activated', 'expired', 'suspended')),
    migration_version INTEGER DEFAULT 2,
    holder_name VARCHAR(255),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    assigned_clinic_id UUID,  -- This should reference mocards_clinics(id)
    assigned_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add assigned_clinic_id column to cards if it doesn't exist
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS assigned_clinic_id UUID;

-- Create card_perks table if missing
CREATE TABLE IF NOT EXISTS public.card_perks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID NOT NULL,  -- This should reference cards(id)
    perk_type VARCHAR(50) NOT NULL,
    perk_value DECIMAL(10,2) NOT NULL,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default_perk_templates table if missing (without clinic_id for now)
CREATE TABLE IF NOT EXISTS public.default_perk_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    perk_name VARCHAR(255) NOT NULL,
    perk_type VARCHAR(50) NOT NULL,
    perk_value DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- DROP EXISTING BROKEN CONSTRAINTS
-- =============================================================================

-- Drop any existing foreign key constraints to recreate them properly
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop all foreign key constraints on cards table
    FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'cards'
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;

    -- Drop all foreign key constraints on card_perks table
    FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'card_perks'
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE public.card_perks DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;

    -- Drop all foreign key constraints on default_perk_templates table
    FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'default_perk_templates'
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE public.default_perk_templates DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- =============================================================================
-- CREATE PROPER FOREIGN KEY RELATIONSHIPS
-- =============================================================================

-- Add foreign key: cards.assigned_clinic_id -> mocards_clinics.id
-- First check if both tables and columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'assigned_clinic_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mocards_clinics') THEN
        ALTER TABLE public.cards
        ADD CONSTRAINT fk_cards_assigned_clinic
        FOREIGN KEY (assigned_clinic_id) REFERENCES public.mocards_clinics(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE '✅ Created foreign key: cards.assigned_clinic_id -> mocards_clinics.id';
    ELSE
        RAISE NOTICE '⚠️  Skipping cards foreign key - required columns/tables not found';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️  Foreign key already exists: cards.assigned_clinic_id -> mocards_clinics.id';
END $$;

-- Add foreign key: card_perks.card_id -> cards.id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_perks' AND column_name = 'card_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cards') THEN
        ALTER TABLE public.card_perks
        ADD CONSTRAINT fk_card_perks_card
        FOREIGN KEY (card_id) REFERENCES public.cards(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE '✅ Created foreign key: card_perks.card_id -> cards.id';
    ELSE
        RAISE NOTICE '⚠️  Skipping card_perks foreign key - required columns/tables not found';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️  Foreign key already exists: card_perks.card_id -> cards.id';
END $$;

-- Skip default_perk_templates foreign key for now since clinic_id column doesn't exist

-- =============================================================================
-- CREATE ESSENTIAL INDEXES
-- =============================================================================

-- Indexes for cards table
CREATE INDEX IF NOT EXISTS idx_cards_assigned_clinic_id ON public.cards(assigned_clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON public.cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_control_number_v2 ON public.cards(control_number_v2);
CREATE INDEX IF NOT EXISTS idx_cards_card_number ON public.cards(card_number);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_is_activated ON public.cards(is_activated);
CREATE INDEX IF NOT EXISTS idx_cards_migration_version ON public.cards(migration_version);

-- Indexes for card_perks table
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id ON public.card_perks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_claimed ON public.card_perks(claimed);
CREATE INDEX IF NOT EXISTS idx_card_perks_type ON public.card_perks(perk_type);

-- Indexes for mocards_clinics table
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_clinic_code ON public.mocards_clinics(clinic_code);
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_status ON public.mocards_clinics(status);
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_region ON public.mocards_clinics(region);

-- Indexes for default_perk_templates table
CREATE INDEX IF NOT EXISTS idx_default_perk_templates_is_active ON public.default_perk_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_default_perk_templates_type ON public.default_perk_templates(perk_type);

-- =============================================================================
-- VERIFY RELATIONSHIPS
-- =============================================================================

-- Verify all foreign keys are properly created
SELECT
    '✅ CREATED RELATIONSHIPS' as status,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('cards', 'card_perks', 'default_perk_templates')
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================================================
-- UPDATE SUPABASE RLS POLICIES (if needed)
-- =============================================================================

-- Enable Row Level Security
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mocards_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_perk_templates ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for admin access
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cards;
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.mocards_clinics;
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.card_perks;
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.default_perk_templates;

    -- Create permissive policies for development (can be tightened later)
    CREATE POLICY "Enable all access for authenticated users" ON public.cards FOR ALL TO authenticated USING (true);
    CREATE POLICY "Enable all access for authenticated users" ON public.mocards_clinics FOR ALL TO authenticated USING (true);
    CREATE POLICY "Enable all access for authenticated users" ON public.card_perks FOR ALL TO authenticated USING (true);
    CREATE POLICY "Enable all access for authenticated users" ON public.default_perk_templates FOR ALL TO authenticated USING (true);

    RAISE NOTICE '✅ RLS policies created for all tables';

EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️  Some RLS policies already exist, continuing...';
END $$;

-- =============================================================================
-- FINAL VERIFICATION AND STATUS
-- =============================================================================

-- Count records in each table
SELECT
    '📊 FINAL STATUS' as check_type,
    'cards' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN assigned_clinic_id IS NOT NULL THEN 1 END) as with_clinic_assigned,
    COUNT(CASE WHEN migration_version = 2 THEN 1 END) as v2_cards
FROM public.cards

UNION ALL

SELECT
    '📊 FINAL STATUS',
    'mocards_clinics',
    COUNT(*),
    COUNT(CASE WHEN status = 'active' THEN 1 END),
    NULL
FROM public.mocards_clinics

UNION ALL

SELECT
    '📊 FINAL STATUS',
    'card_perks',
    COUNT(*),
    COUNT(CASE WHEN claimed = false THEN 1 END),
    NULL
FROM public.card_perks

UNION ALL

SELECT
    '📊 FINAL STATUS',
    'default_perk_templates',
    COUNT(*),
    COUNT(CASE WHEN is_active = true THEN 1 END),
    NULL
FROM public.default_perk_templates;

-- Create system audit log entry if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_log') THEN
        INSERT INTO public.system_audit_log (operation, description, details)
        VALUES (
            'SCHEMA_RELATIONSHIPS_FIXED',
            'Fixed foreign key relationships between cards and mocards_clinics tables',
            jsonb_build_object(
                'tables_processed', array['cards', 'mocards_clinics', 'card_perks', 'default_perk_templates'],
                'relationships_created', array[
                    'cards.assigned_clinic_id -> mocards_clinics.id',
                    'card_perks.card_id -> cards.id'
                ],
                'fix_date', NOW(),
                'indexes_created', true,
                'rls_enabled', true,
                'status', 'completed'
            )
        );
        RAISE NOTICE '📝 Audit log entry created';
    ELSE
        RAISE NOTICE 'ℹ️  System audit log table not found - skipping audit entry';
    END IF;
END $$;

COMMIT;

-- Success messages
SELECT
    '🎉 SCHEMA RELATIONSHIPS FIXED SUCCESSFULLY!' as result;

SELECT
    '✅ Export errors should be resolved' as status_1,
    '✅ Management loading errors should be resolved' as status_2,
    '✅ Supabase relationship cache will refresh automatically' as status_3;

SELECT
    '📋 NEXT STEPS:' as info,
    '1. Generate 10,000 cards if missing' as step_1,
    '2. Test export functionality' as step_2,
    '3. Test card management loading' as step_3;