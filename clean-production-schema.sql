-- =============================================================================
-- CLEAN PRODUCTION SCHEMA - EXECUTE IN SUPABASE SQL EDITOR
-- =============================================================================
-- This creates the complete updated schema with all fixes applied

-- =============================================================================
-- 1. CORE CARDS TABLE (Updated with all migrations)
-- =============================================================================

-- Drop existing table if recreating (CAREFUL - this deletes all data!)
-- DROP TABLE IF EXISTS public.cards CASCADE;

-- Create cards table with updated structure
CREATE TABLE IF NOT EXISTS public.cards (
  -- Core identifiers
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_number INTEGER,
  display_card_number INTEGER,

  -- Control number formats (unified system)
  control_number VARCHAR(50),
  control_number_v2 VARCHAR(255),
  unified_control_number VARCHAR(255),

  -- Optional passcode (NULLABLE - fixed!)
  passcode VARCHAR(50) NULL DEFAULT NULL,

  -- Location & clinic assignment
  location_code VARCHAR(10),
  location_code_v2 VARCHAR(10),
  clinic_code_v2 VARCHAR(20),
  assigned_clinic_id UUID,

  -- Status & activation
  status VARCHAR(50) DEFAULT 'unassigned',
  is_activated BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP,
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- System management
  batch_id UUID,
  migration_version INTEGER DEFAULT 3,
  generation_method VARCHAR(20) DEFAULT 'auto',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 2. CARD BATCHES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  total_cards INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_by VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 3. CLINICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mocards_clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name VARCHAR(255) NOT NULL,
  clinic_code VARCHAR(20) NOT NULL UNIQUE,
  location_code VARCHAR(10),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 4. PERKS SYSTEM TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  perk_type VARCHAR(50) NOT NULL,
  perk_value DECIMAL(10,2) DEFAULT 0.00,
  is_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- =============================================================================
-- 5. DEFAULT PERK TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.default_perk_datalates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perk_name VARCHAR(255) NOT NULL,
  perk_type VARCHAR(50) NOT NULL,
  perk_value DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 6. FIX EXISTING SCHEMA (if updating existing database)
-- =============================================================================

-- Make passcode nullable if it exists and is NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'passcode' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.cards ALTER COLUMN passcode DROP NOT NULL;
    ALTER TABLE public.cards ALTER COLUMN passcode SET DEFAULT NULL;
  END IF;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS card_number INTEGER;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS display_card_number INTEGER;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS unified_control_number VARCHAR(255);
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS control_number_v2 VARCHAR(255);
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_code_v2 VARCHAR(10);
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS clinic_code_v2 VARCHAR(20);
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS assigned_clinic_id UUID;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'unassigned';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS migration_version INTEGER DEFAULT 3;

-- =============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_cards_card_number ON public.cards(card_number);
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON public.cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_unified_control ON public.cards(unified_control_number);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_clinic ON public.cards(assigned_clinic_id);

-- =============================================================================
-- 8. VERIFICATION QUERIES
-- =============================================================================

-- Check if passcode is now nullable
SELECT
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cards' AND column_name = 'passcode';

-- Check table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cards'
ORDER BY ordinal_position;