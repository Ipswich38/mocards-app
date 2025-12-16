-- =============================================================================
-- FINAL UPDATED SCHEMA V3.0 - PRODUCTION READY
-- =============================================================================
-- Complete schema with all recent enhancements and fixes
-- Includes: Reset/Deactivate functionality, Enhanced Activation, Redemption System

-- =============================================================================
-- 1. CORE CARDS TABLE (Final Version)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cards (
  -- Core identifiers
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_number INTEGER,                    -- Sequential 1-10000 (internal)
  display_card_number INTEGER,            -- Display range 10000-19999 (customer-facing)

  -- Control number formats (unified system)
  control_number VARCHAR(50),             -- Legacy: MOC-00001
  control_number_v2 VARCHAR(255),         -- V2: MOC-__-____-00001
  unified_control_number VARCHAR(255),    -- Final: MOC-10000-01-CVT001

  -- Passcode (NOW NULLABLE - FIXED!)
  passcode VARCHAR(50) NULL DEFAULT NULL,

  -- Location & clinic assignment
  location_code VARCHAR(10),              -- Original location code
  location_code_v2 VARCHAR(10),          -- Updated location (01-16 Philippines)
  clinic_code_v2 VARCHAR(20),            -- Clinic assignment (CVT001, etc.)
  assigned_clinic_id UUID,               -- Links to mocards_clinics

  -- Status & activation (Enhanced)
  status VARCHAR(50) DEFAULT 'unassigned', -- unassigned|assigned|activated|expired|suspended
  is_activated BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP,
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- System management
  batch_id UUID,                          -- Links to card_batches
  migration_version INTEGER DEFAULT 3,    -- Current version tracker
  generation_method VARCHAR(20) DEFAULT 'auto',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 2. CARD BATCHES (Generation Tracking)
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
-- 3. CLINICS MANAGEMENT
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
-- 4. ENHANCED PERK SYSTEM (With Redemption)
-- =============================================================================

-- Card perks (assigned to individual cards)
CREATE TABLE IF NOT EXISTS public.card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  perk_type VARCHAR(50) NOT NULL,
  perk_value DECIMAL(10,2) DEFAULT 0.00,
  perk_description TEXT,
  is_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  claimed_by VARCHAR(255),              -- Who redeemed it
  claimed_at_clinic_id UUID REFERENCES public.mocards_clinics(id),
  redemption_notes TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default perk templates
CREATE TABLE IF NOT EXISTS public.default_perk_datalates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perk_name VARCHAR(255) NOT NULL,
  perk_type VARCHAR(50) NOT NULL,
  perk_value DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT true,
  customizable BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 5. REDEMPTION TRACKING SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.perk_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  perk_id UUID REFERENCES public.card_perks(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.mocards_clinics(id),

  -- Redemption details
  redeemed_by_admin VARCHAR(255),        -- Admin who processed redemption
  redeemed_by_type VARCHAR(50),          -- 'admin' | 'clinic_staff' | 'self_service'
  redemption_method VARCHAR(50),         -- 'manual' | 'qr_scan' | 'card_lookup'

  -- Financial tracking
  original_value DECIMAL(10,2),
  redeemed_value DECIMAL(10,2),
  discount_applied DECIMAL(5,2),         -- Percentage discount if any

  -- Metadata
  redemption_notes TEXT,
  transaction_reference VARCHAR(100),
  patient_satisfaction INTEGER CHECK (patient_satisfaction BETWEEN 1 AND 5),

  -- Timestamps
  redeemed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 6. ASSIGNMENT HISTORY (For Auditing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.card_assignment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.mocards_clinics(id),

  assignment_type VARCHAR(50),           -- 'assigned' | 'activated' | 'reset' | 'deactivated'
  assigned_by_type VARCHAR(50),          -- 'admin' | 'clinic' | 'system'
  assigned_by_id VARCHAR(255),
  assigned_by_name VARCHAR(255),
  assignment_reason TEXT,
  assignment_details JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 7. PERFORMANCE INDEXES
-- =============================================================================

-- Core card indexes
CREATE INDEX IF NOT EXISTS idx_cards_card_number ON public.cards(card_number);
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON public.cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_unified_control ON public.cards(unified_control_number);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_clinic ON public.cards(assigned_clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_batch ON public.cards(batch_id);

-- Perk system indexes
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id ON public.card_perks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_claimed ON public.card_perks(is_claimed);
CREATE INDEX IF NOT EXISTS idx_card_perks_type ON public.card_perks(perk_type);

-- Redemption indexes
CREATE INDEX IF NOT EXISTS idx_redemptions_card ON public.perk_redemptions(card_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_clinic ON public.perk_redemptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_date ON public.perk_redemptions(redeemed_at);

-- =============================================================================
-- 8. SAMPLE DATA (Default Perks)
-- =============================================================================

INSERT INTO public.default_perk_datalates (perk_name, perk_type, perk_value, description, display_order)
VALUES
  ('Free Consultation', 'consultation', 500.00, 'Initial dental consultation and examination', 1),
  ('Dental Cleaning', 'cleaning', 800.00, 'Professional teeth cleaning and oral prophylaxis', 2),
  ('Dental X-Ray', 'xray', 300.00, 'Digital dental X-ray imaging', 3),
  ('Tooth Extraction', 'extraction', 1200.00, 'Simple tooth extraction procedure', 4),
  ('Dental Filling', 'filling', 1000.00, 'Composite dental filling', 5)
ON CONFLICT (perk_type) DO UPDATE SET
  perk_value = EXCLUDED.perk_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =============================================================================
-- 9. UPDATED FUNCTIONS FOR V3.0
-- =============================================================================

-- Function to get card with redemption status
CREATE OR REPLACE FUNCTION get_card_with_redemption_status(search_term TEXT)
RETURNS TABLE(
  id UUID,
  card_number INTEGER,
  unified_control_number TEXT,
  status TEXT,
  is_activated BOOLEAN,
  clinic_name TEXT,
  total_perks INTEGER,
  claimed_perks INTEGER,
  unclaimed_perks INTEGER,
  total_perk_value DECIMAL,
  claimed_value DECIMAL,
  available_value DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.card_number,
    COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
    COALESCE(c.status::TEXT, 'unassigned') as status,
    COALESCE(c.is_activated, false) as is_activated,
    COALESCE(cl.clinic_name::TEXT, '') as clinic_name,

    COALESCE(perk_stats.total_perks, 0) as total_perks,
    COALESCE(perk_stats.claimed_perks, 0) as claimed_perks,
    COALESCE(perk_stats.unclaimed_perks, 0) as unclaimed_perks,
    COALESCE(perk_stats.total_value, 0.00) as total_perk_value,
    COALESCE(perk_stats.claimed_value, 0.00) as claimed_value,
    COALESCE(perk_stats.available_value, 0.00) as available_value

  FROM public.cards c
  LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
  LEFT JOIN (
    SELECT
      cp.card_id,
      COUNT(*) as total_perks,
      COUNT(*) FILTER (WHERE cp.is_claimed = true) as claimed_perks,
      COUNT(*) FILTER (WHERE cp.is_claimed = false) as unclaimed_perks,
      SUM(cp.perk_value) as total_value,
      SUM(cp.perk_value) FILTER (WHERE cp.is_claimed = true) as claimed_value,
      SUM(cp.perk_value) FILTER (WHERE cp.is_claimed = false) as available_value
    FROM public.card_perks cp
    GROUP BY cp.card_id
  ) perk_stats ON perk_stats.card_id = c.id
  WHERE c.card_number BETWEEN 1 AND 10000
  AND (
    c.card_number::TEXT = search_term
    OR c.control_number ILIKE search_term
    OR c.unified_control_number ILIKE search_term
  )
  ORDER BY c.card_number;
END $$;

-- =============================================================================
-- 10. VERIFICATION QUERIES
-- =============================================================================

-- Check schema is properly updated
SELECT
  'Schema V3.0 Status' as component,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'unified_control_number')
    THEN '✅ Cards table updated'
    ELSE '❌ Cards table missing columns'
  END as status
UNION ALL
SELECT
  'Perk Redemption System',
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perk_redemptions')
    THEN '✅ Redemption system ready'
    ELSE '❌ Missing redemption tables'
  END
UNION ALL
SELECT
  'Passcode Constraint',
  CASE
    WHEN (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'passcode') = 'YES'
    THEN '✅ Passcode nullable'
    ELSE '❌ Passcode still NOT NULL'
  END;

-- Sample card and perk counts
SELECT
  (SELECT COUNT(*) FROM public.cards WHERE card_number BETWEEN 1 AND 10000) as total_cards,
  (SELECT COUNT(*) FROM public.card_perks) as total_perks,
  (SELECT COUNT(*) FROM public.mocards_clinics WHERE is_active = true) as active_clinics;