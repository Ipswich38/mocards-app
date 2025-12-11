-- MOC Card System V2.0 Schema
-- Complete database schema for the new MOC system
-- Run this script to update your database for 10,000 card generation

-- 1. Create new location codes table (01-16 Philippine regions)
CREATE TABLE IF NOT EXISTS location_codes_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(2) NOT NULL UNIQUE, -- 01 to 16
  region_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create clinic codes by region table
CREATE TABLE IF NOT EXISTS clinic_codes_by_region (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_code VARCHAR(4) NOT NULL UNIQUE, -- 4-digit code
  region_type VARCHAR(20) NOT NULL, -- 'visayas', 'luzon_4a', 'ncr'
  region_name VARCHAR(100) NOT NULL,
  location_code VARCHAR(2) REFERENCES location_codes_v2(code),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update cards table for new MOC format (MOC-XX-XXXX-NNNNN)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS control_number_v2 VARCHAR(17); -- MOC-XX-XXXX-NNNNN
ALTER TABLE cards ADD COLUMN IF NOT EXISTS location_code_v2 VARCHAR(2);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS clinic_code_v2 VARCHAR(4);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_number INTEGER; -- 1 to 10000+
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS activated_by_clinic_id UUID;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS migration_version INTEGER DEFAULT 2;

-- 4. Create default perks templates table
CREATE TABLE IF NOT EXISTS default_perk_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perk_name VARCHAR(100) NOT NULL,
  perk_type VARCHAR(50) NOT NULL, -- 'discount', 'cashback', 'service', 'consultation', 'cleaning', 'xray', 'extraction', 'filling', 'freebie', 'points'
  perk_value DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT true,
  customizable BOOLEAN DEFAULT false,
  max_redemptions INTEGER,
  valid_for_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Update card_perks table to support new system
ALTER TABLE card_perks ADD COLUMN IF NOT EXISTS perk_template_id UUID REFERENCES default_perk_templates(id);
ALTER TABLE card_perks ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;

-- 6. Create card activation log for audit trail
CREATE TABLE IF NOT EXISTS card_activation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id),
  old_control_number VARCHAR(50),
  new_control_number VARCHAR(17),
  location_code VARCHAR(2),
  clinic_code VARCHAR(4),
  activated_by_clinic_id UUID,
  activation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 7. Insert location codes (01-16 for all Philippine regions)
INSERT INTO location_codes_v2 (code, region_name, description, sort_order) VALUES
('01', 'National Capital Region (NCR)', 'Metro Manila and surrounding areas', 1),
('02', 'Cordillera Administrative Region (CAR)', 'Mountain provinces', 2),
('03', 'Region I (Ilocos Region)', 'Ilocos Norte, Ilocos Sur, La Union, Pangasinan', 3),
('04', 'Region II (Cagayan Valley)', 'Cagayan, Isabela, Nueva Vizcaya, Quirino', 4),
('05', 'Region III (Central Luzon)', 'Aurora, Bataan, Bulacan, Nueva Ecija, Pampanga, Tarlac, Zambales', 5),
('06', 'Region IV-A (CALABARZON)', 'Cavite, Laguna, Batangas, Rizal, Quezon', 6),
('07', 'Region IV-B (MIMAROPA)', 'Marinduque, Occidental Mindoro, Oriental Mindoro, Palawan, Romblon', 7),
('08', 'Region V (Bicol Region)', 'Albay, Camarines Norte, Camarines Sur, Catanduanes, Masbate, Sorsogon', 8),
('09', 'Region VI (Western Visayas)', 'Aklan, Antique, Capiz, Guimaras, Iloilo, Negros Occidental', 9),
('10', 'Region VII (Central Visayas)', 'Bohol, Cebu, Negros Oriental, Siquijor', 10),
('11', 'Region VIII (Eastern Visayas)', 'Biliran, Eastern Samar, Leyte, Northern Samar, Samar, Southern Leyte', 11),
('12', 'Region IX (Zamboanga Peninsula)', 'Zamboanga del Norte, Zamboanga del Sur, Zamboanga Sibugay', 12),
('13', 'Region X (Northern Mindanao)', 'Bukidnon, Camiguin, Lanao del Norte, Misamis Occidental, Misamis Oriental', 13),
('14', 'Region XI (Davao Region)', 'Davao de Oro, Davao del Norte, Davao del Sur, Davao Occidental, Davao Oriental', 14),
('15', 'Region XII (SOCCSKSARGEN)', 'Cotabato, Sarangani, South Cotabato, Sultan Kudarat', 15),
('16', 'Region XIII (Caraga)', 'Agusan del Norte, Agusan del Sur, Dinagat Islands, Surigao del Norte, Surigao del Sur', 16)
ON CONFLICT (code) DO NOTHING;

-- 8. Insert clinic codes by region
INSERT INTO clinic_codes_by_region (clinic_code, region_type, region_name, location_code, description, sort_order) VALUES
-- Visayas: Cebu (Region VII - Central Visayas)
('CEB1', 'visayas', 'Cebu - Primary Dental Centers', '10', 'Main dental clinics in Cebu City', 1),
('CEB2', 'visayas', 'Cebu - Secondary Centers', '10', 'Satellite dental clinics in Cebu Province', 2),
('CEB3', 'visayas', 'Cebu - Specialized Centers', '10', 'Specialized dental services in Cebu', 3),

-- Luzon: Region 4A (CALABARZON)
('CAV1', 'luzon_4a', 'Cavite Dental Centers', '06', 'Dental clinics in Cavite Province', 4),
('LAG1', 'luzon_4a', 'Laguna Dental Centers', '06', 'Dental clinics in Laguna Province', 5),
('BAT1', 'luzon_4a', 'Batangas Dental Centers', '06', 'Dental clinics in Batangas Province', 6),
('RIZ1', 'luzon_4a', 'Rizal Dental Centers', '06', 'Dental clinics in Rizal Province', 7),
('QUE1', 'luzon_4a', 'Quezon Province Centers', '06', 'Dental clinics in Quezon Province', 8),

-- National Capital Region (NCR) - All major cities
('NCR1', 'ncr', 'Manila Dental Centers', '01', 'Dental clinics in Manila', 9),
('NCR2', 'ncr', 'Quezon City Centers', '01', 'Dental clinics in Quezon City', 10),
('NCR3', 'ncr', 'Makati Centers', '01', 'Dental clinics in Makati', 11),
('NCR4', 'ncr', 'Pasig Centers', '01', 'Dental clinics in Pasig', 12),
('NCR5', 'ncr', 'Taguig Centers', '01', 'Dental clinics in Taguig', 13),
('NCR6', 'ncr', 'Marikina Centers', '01', 'Dental clinics in Marikina', 14),
('NCR7', 'ncr', 'Caloocan Centers', '01', 'Dental clinics in Caloocan', 15),
('NCR8', 'ncr', 'Las Piñas Centers', '01', 'Dental clinics in Las Piñas', 16),
('NCR9', 'ncr', 'Muntinlupa Centers', '01', 'Dental clinics in Muntinlupa', 17),
('NC10', 'ncr', 'Mandaluyong Centers', '01', 'Dental clinics in Mandaluyong', 18),
('NC11', 'ncr', 'San Juan Centers', '01', 'Dental clinics in San Juan', 19),
('NC12', 'ncr', 'Parañaque Centers', '01', 'Dental clinics in Parañaque', 20),
('NC13', 'ncr', 'Valenzuela Centers', '01', 'Dental clinics in Valenzuela', 21),
('NC14', 'ncr', 'Malabon Centers', '01', 'Dental clinics in Malabon', 22),
('NC15', 'ncr', 'Navotas Centers', '01', 'Dental clinics in Navotas', 23),
('NC16', 'ncr', 'Pateros Centers', '01', 'Dental clinics in Pateros', 24),
('NC17', 'ncr', 'Pasay Centers', '01', 'Dental clinics in Pasay', 25)
ON CONFLICT (clinic_code) DO NOTHING;

-- 9. Insert default perk templates (dental services)
INSERT INTO default_perk_templates (perk_name, perk_type, perk_value, description, is_default, customizable) VALUES
('Free Consultation', 'consultation', 500.00, 'Free initial dental consultation (worth ₱500)', true, true),
('Teeth Cleaning', 'cleaning', 800.00, 'Professional teeth cleaning service', true, true),
('Dental X-Ray', 'xray', 1000.00, 'Dental X-ray imaging service', true, true),
('Tooth Extraction', 'extraction', 1500.00, 'Simple tooth extraction service', true, true),
('Dental Filling', 'filling', 1200.00, 'Composite dental filling service', true, true),
('New Patient Discount', 'discount', 20.00, '20% discount for new patients', true, true),
('Senior Citizen Discount', 'discount', 30.00, '30% discount for senior citizens', true, true),
('Student Discount', 'discount', 15.00, '15% discount for students with valid ID', true, true),
('Checkup Cashback', 'cashback', 100.00, '₱100 cashback on routine checkup', true, true),
('Loyalty Points', 'points', 10.00, '10 points per visit for loyalty program', true, true)
ON CONFLICT (perk_name) DO NOTHING;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_control_number_v2 ON cards(control_number_v2);
CREATE INDEX IF NOT EXISTS idx_cards_card_number ON cards(card_number);
CREATE INDEX IF NOT EXISTS idx_cards_is_activated ON cards(is_activated);
CREATE INDEX IF NOT EXISTS idx_cards_location_code_v2 ON cards(location_code_v2);
CREATE INDEX IF NOT EXISTS idx_cards_clinic_code_v2 ON cards(clinic_code_v2);
CREATE INDEX IF NOT EXISTS idx_cards_migration_version ON cards(migration_version);
CREATE INDEX IF NOT EXISTS idx_clinic_codes_region_type ON clinic_codes_by_region(region_type);
CREATE INDEX IF NOT EXISTS idx_location_codes_v2_code ON location_codes_v2(code);
CREATE INDEX IF NOT EXISTS idx_location_codes_v2_active ON location_codes_v2(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_codes_active ON clinic_codes_by_region(is_active);
CREATE INDEX IF NOT EXISTS idx_default_perks_active ON default_perk_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_default_perks_default ON default_perk_templates(is_default);

-- 11. Create functions for MOC system

-- Function to generate new control number V2
CREATE OR REPLACE FUNCTION generate_control_number_v2(
  p_location_code VARCHAR(2) DEFAULT NULL,
  p_clinic_code VARCHAR(4) DEFAULT NULL,
  p_card_number INTEGER DEFAULT NULL
) RETURNS VARCHAR(17) AS $$
BEGIN
  -- If any parameter is null, return format with blanks
  IF p_location_code IS NULL OR p_clinic_code IS NULL THEN
    RETURN 'MOC-__-____-' || LPAD(p_card_number::TEXT, 5, '0');
  END IF;

  -- Return complete format
  RETURN 'MOC-' || p_location_code || '-' || p_clinic_code || '-' || LPAD(p_card_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to activate card with new control number
CREATE OR REPLACE FUNCTION activate_card_v2(
  p_card_id UUID,
  p_location_code VARCHAR(2),
  p_clinic_code VARCHAR(4),
  p_clinic_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_card_number INTEGER;
  v_old_control_number VARCHAR(17);
  v_new_control_number VARCHAR(17);
BEGIN
  -- Get card details
  SELECT card_number, control_number_v2
  INTO v_card_number, v_old_control_number
  FROM cards
  WHERE id = p_card_id;

  -- Generate new control number
  v_new_control_number := generate_control_number_v2(p_location_code, p_clinic_code, v_card_number);

  -- Update card
  UPDATE cards
  SET
    control_number_v2 = v_new_control_number,
    location_code_v2 = p_location_code,
    clinic_code_v2 = p_clinic_code,
    is_activated = true,
    activated_at = NOW(),
    activated_by_clinic_id = p_clinic_id,
    status = 'activated',
    updated_at = NOW()
  WHERE id = p_card_id;

  -- Log activation
  INSERT INTO card_activation_log (
    card_id, old_control_number, new_control_number,
    location_code, clinic_code, activated_by_clinic_id
  ) VALUES (
    p_card_id, v_old_control_number, v_new_control_number,
    p_location_code, p_clinic_code, p_clinic_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign default perks to activated cards
CREATE OR REPLACE FUNCTION assign_default_perks_to_card(p_card_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert default perks for the card
  INSERT INTO card_perks (card_id, perk_type, perk_value, claimed, perk_template_id, auto_assigned)
  SELECT
    p_card_id,
    dt.perk_type,
    dt.perk_value,
    false,
    dt.id,
    true
  FROM default_perk_templates dt
  WHERE dt.is_active = true AND dt.is_default = true;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign perks when card is activated
CREATE OR REPLACE FUNCTION trigger_assign_default_perks()
RETURNS TRIGGER AS $$
BEGIN
  -- If card was just activated, assign default perks
  IF NEW.is_activated = true AND (OLD.is_activated = false OR OLD.is_activated IS NULL) THEN
    PERFORM assign_default_perks_to_card(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_card_activation_perks ON cards;
CREATE TRIGGER trigger_card_activation_perks
  AFTER UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION trigger_assign_default_perks();

-- 12. Enable Row Level Security (RLS)
ALTER TABLE location_codes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_codes_by_region ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_perk_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_activation_log ENABLE ROW LEVEL SECURITY;

-- Allow public read access to location and clinic codes
CREATE POLICY "Allow public read location codes v2" ON location_codes_v2 FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read clinic codes" ON clinic_codes_by_region FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read perk templates" ON default_perk_templates FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read activation log" ON card_activation_log FOR SELECT TO public USING (true);

-- Allow admin operations (adjust based on your auth system)
CREATE POLICY "Allow admin all operations location codes v2" ON location_codes_v2 FOR ALL TO public USING (true);
CREATE POLICY "Allow admin all operations clinic codes" ON clinic_codes_by_region FOR ALL TO public USING (true);
CREATE POLICY "Allow admin all operations perk templates" ON default_perk_templates FOR ALL TO public USING (true);
CREATE POLICY "Allow admin all operations activation log" ON card_activation_log FOR ALL TO public USING (true);

-- 13. Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_location_codes_v2_updated_at BEFORE UPDATE ON location_codes_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinic_codes_updated_at BEFORE UPDATE ON clinic_codes_by_region FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_perk_templates_updated_at BEFORE UPDATE ON default_perk_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Schema update complete!
-- You can now use the MOC Card System V2.0 to generate 10,000 cards