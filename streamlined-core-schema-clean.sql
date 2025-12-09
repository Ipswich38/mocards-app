-- ===================================================================
-- STREAMLINED MOCARDS CORE SCHEMA
-- Focused on: Card Generation → Clinic Management → Card Assignment
-- ===================================================================

-- Clean existing schema (for fresh installation)
DROP TABLE IF EXISTS public.card_perks CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.card_batches CASCADE;
DROP TABLE IF EXISTS public.clinics CASCADE;
DROP TABLE IF EXISTS public.admin_accounts CASCADE;
DROP TABLE IF EXISTS public.location_codes CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS assign_cards_to_clinic(UUID, INTEGER);
DROP FUNCTION IF EXISTS generate_passcode(TEXT);
DROP FUNCTION IF EXISTS generate_control_number(TEXT, INTEGER, TEXT);

-- Core clinic management
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name VARCHAR(255) NOT NULL UNIQUE,
  clinic_code VARCHAR(50) NOT NULL UNIQUE,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Card batch management for organized generation
CREATE TABLE IF NOT EXISTS public.card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(100) NOT NULL UNIQUE,
  total_cards INTEGER NOT NULL,
  cards_assigned INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Core card management
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.card_batches(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  control_number VARCHAR(50) NOT NULL UNIQUE,
  passcode VARCHAR(50) NOT NULL,
  location_code VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned', 'activated', 'expired', 'suspended')),
  assigned_at TIMESTAMP,
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  generation_method VARCHAR(20) DEFAULT 'auto' CHECK (generation_method IN ('auto', 'manual', 'range')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified perk system (core dental services only)
CREATE TABLE IF NOT EXISTS public.card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  perk_type VARCHAR(50) NOT NULL CHECK (perk_type IN ('consultation', 'cleaning', 'xray', 'extraction', 'filling')),
  perk_value DECIMAL(10,2) DEFAULT 0.00,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin accounts (simplified)
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  email VARCHAR(100),
  role VARCHAR(20) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Location codes for passcode generation
CREATE TABLE IF NOT EXISTS public.location_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  location_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- DEFAULT DATA
-- ===================================================================

-- Insert default location codes
INSERT INTO public.location_codes (code, location_name, description) VALUES
('001', 'Metro Manila', 'National Capital Region'),
('002', 'Cebu', 'Central Visayas'),
('003', 'Davao', 'Davao Region'),
('004', 'Baguio', 'Cordillera Administrative Region'),
('005', 'Iloilo', 'Western Visayas')
ON CONFLICT (code) DO NOTHING;

-- Insert demo admin account
INSERT INTO public.admin_accounts (username, password_hash, full_name, email) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin@mocards.com')
ON CONFLICT (username) DO NOTHING;

-- Insert demo clinic
INSERT INTO public.clinics (clinic_name, clinic_code, contact_person, email, password_hash, city, province) VALUES
('Demo Dental Clinic', 'DEMO001', 'Dr. Demo', 'demo@clinic.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Manila', 'Metro Manila')
ON CONFLICT (clinic_code) DO NOTHING;

-- ===================================================================
-- INDEXES FOR PERFORMANCE (Create after tables)
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_cards_control_number ON public.cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_passcode ON public.cards(passcode);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_id ON public.cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_batch_id ON public.cards(batch_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id ON public.card_perks(card_id);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON public.clinics(status);

-- ===================================================================
-- STORED FUNCTIONS FOR STREAMLINED OPERATIONS
-- ===================================================================

-- Function to generate control numbers
CREATE OR REPLACE FUNCTION generate_control_number(
  batch_prefix TEXT,
  sequence_number INTEGER,
  location_prefix TEXT DEFAULT 'PHL'
) RETURNS TEXT AS $$
BEGIN
  RETURN format('%s-%s-%s',
    location_prefix,
    batch_prefix,
    LPAD(sequence_number::TEXT, 4, '0')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to generate passcodes (location + random 4 digits)
CREATE OR REPLACE FUNCTION generate_passcode(
  location_code TEXT
) RETURNS TEXT AS $$
DECLARE
  random_digits TEXT;
BEGIN
  -- Generate 4 random digits
  random_digits := LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
  RETURN location_code || '-' || random_digits;
END;
$$ LANGUAGE plpgsql;

-- Function to assign cards to clinic (created after tables exist)
CREATE OR REPLACE FUNCTION assign_cards_to_clinic(
  p_clinic_id UUID,
  p_card_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
  assigned_count INTEGER := 0;
  card_record RECORD;
BEGIN
  -- Ensure tables exist before proceeding
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cards') THEN
    RAISE EXCEPTION 'Cards table does not exist';
  END IF;

  -- Get unassigned cards and assign to clinic
  FOR card_record IN
    SELECT id FROM public.cards
    WHERE status = 'unassigned'
    LIMIT p_card_count
  LOOP
    UPDATE public.cards
    SET
      clinic_id = p_clinic_id,
      status = 'assigned',
      assigned_at = NOW()
    WHERE id = card_record.id;

    assigned_count := assigned_count + 1;
  END LOOP;

  -- Update batch assignment count
  UPDATE public.card_batches
  SET cards_assigned = cards_assigned + assigned_count
  WHERE id IN (
    SELECT DISTINCT batch_id FROM public.cards
    WHERE clinic_id = p_clinic_id AND assigned_at >= NOW() - INTERVAL '1 minute'
  );

  RETURN assigned_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- RLS POLICIES (SIMPLIFIED)
-- ===================================================================

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_codes ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (to be restricted in production)
CREATE POLICY "Allow all operations" ON public.clinics FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.cards FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.card_batches FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.card_perks FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.admin_accounts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.location_codes FOR ALL USING (true);

-- ===================================================================
-- PERMISSIONS
-- ===================================================================

GRANT ALL ON public.clinics TO anon, authenticated;
GRANT ALL ON public.cards TO anon, authenticated;
GRANT ALL ON public.card_batches TO anon, authenticated;
GRANT ALL ON public.card_perks TO anon, authenticated;
GRANT ALL ON public.admin_accounts TO anon, authenticated;
GRANT ALL ON public.location_codes TO anon, authenticated;