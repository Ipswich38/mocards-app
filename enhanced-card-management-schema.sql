-- ===================================================================
-- ENHANCED CARD MANAGEMENT SCHEMA
-- Admin superpower controls for all card numbers, codes, and generation
-- ===================================================================

-- Create code generation settings table for admin control
CREATE TABLE IF NOT EXISTS public.code_generation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_type VARCHAR(50) NOT NULL, -- 'batch', 'control', 'passcode', 'location'
  generation_mode VARCHAR(30) NOT NULL, -- 'auto', 'manual', 'range'
  pattern_template VARCHAR(100), -- e.g., 'B{year}{month}-{sequence}', 'C{batch}-{index}'
  location_prefix VARCHAR(3), -- First 3 digits for location
  auto_range_start INTEGER DEFAULT 1,
  auto_range_end INTEGER DEFAULT 999,
  current_sequence INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(setting_type, generation_mode)
);

-- Create location codes management table
CREATE TABLE IF NOT EXISTS public.location_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  location_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhance card_batches table with more admin control
ALTER TABLE public.card_batches
ADD COLUMN IF NOT EXISTS generation_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_prefix VARCHAR(20),
ADD COLUMN IF NOT EXISTS sequence_start INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sequence_end INTEGER,
ADD COLUMN IF NOT EXISTS location_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Enhance cards table with admin control fields
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS original_control_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS original_passcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS custom_control_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS custom_passcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS location_prefix VARCHAR(3),
ADD COLUMN IF NOT EXISTS random_suffix VARCHAR(4),
ADD COLUMN IF NOT EXISTS generation_method VARCHAR(20) DEFAULT 'auto', -- 'auto', 'manual', 'range'
ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS last_modified_by UUID,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP DEFAULT NOW();

-- Create card code history table for tracking changes
CREATE TABLE IF NOT EXISTS public.card_code_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  change_type VARCHAR(30) NOT NULL, -- 'created', 'control_updated', 'passcode_updated', 'batch_updated'
  old_value TEXT,
  new_value TEXT,
  field_name VARCHAR(50), -- 'control_number', 'passcode', 'batch_id', etc.
  changed_by UUID,
  change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create system version tracking for real-time updates
CREATE TABLE IF NOT EXISTS public.system_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  component VARCHAR(50) NOT NULL, -- 'cards', 'batches', 'settings', 'codes'
  version_number INTEGER NOT NULL DEFAULT 1,
  change_description TEXT,
  changed_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(component)
);

-- Create user session state table for preserving work
CREATE TABLE IF NOT EXISTS public.user_session_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_type VARCHAR(20), -- 'admin', 'clinic', 'cardholder'
  component_name VARCHAR(50), -- 'card_creation', 'batch_generation', etc.
  form_data JSONB DEFAULT '{}',
  draft_state JSONB DEFAULT '{}',
  last_saved TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(user_id, component_name)
);

-- Insert default location codes
INSERT INTO public.location_codes (code, location_name, description, sort_order) VALUES
('PHL', 'Philippines', 'Default Philippines location code', 1),
('MNL', 'Manila', 'Manila Metro area', 2),
('CEB', 'Cebu', 'Cebu Province', 3),
('DVA', 'Davao', 'Davao Region', 4),
('BGO', 'Baguio', 'Baguio City', 5),
('ILO', 'Iloilo', 'Iloilo Province', 6),
('BAC', 'Bacolod', 'Bacolod City', 7),
('TAC', 'Tacloban', 'Tacloban City', 8)
ON CONFLICT (code) DO NOTHING;

-- Insert default code generation settings
INSERT INTO public.code_generation_settings (setting_type, generation_mode, pattern_template, location_prefix, metadata) VALUES
('batch', 'auto', 'B{year}{month}-{sequence}', 'PHL', '{"auto_increment": true, "format": "B2024MM-NNN"}'),
('control', 'auto', 'C{batch_prefix}-{index}', 'PHL', '{"zero_pad": 3, "separator": "-"}'),
('passcode', 'auto', '{location}{random}', 'PHL', '{"location_digits": 3, "random_digits": 4}'),
('batch', 'manual', 'CUSTOM-{input}', 'PHL', '{"allow_custom": true}'),
('control', 'range', 'R{start}-{end}', 'PHL', '{"range_based": true}')
ON CONFLICT (setting_type, generation_mode) DO NOTHING;

-- Initialize system versions
INSERT INTO public.system_versions (component, version_number, change_description) VALUES
('cards', 1, 'Initial enhanced card management system'),
('batches', 1, 'Initial batch management system'),
('settings', 1, 'Initial code generation settings'),
('codes', 1, 'Initial location codes setup')
ON CONFLICT (component) DO NOTHING;

-- Advanced code generation functions
CREATE OR REPLACE FUNCTION generate_batch_number(
  generation_mode VARCHAR(30),
  custom_input TEXT DEFAULT NULL,
  location_prefix VARCHAR(3) DEFAULT 'PHL'
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
  sequence_num INTEGER;
  current_year INTEGER;
  current_month INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());
  current_month := EXTRACT(MONTH FROM NOW());

  CASE generation_mode
    WHEN 'auto' THEN
      -- Get next sequence number
      UPDATE code_generation_settings
      SET current_sequence = current_sequence + 1
      WHERE setting_type = 'batch' AND generation_mode = 'auto'
      RETURNING current_sequence INTO sequence_num;

      result := 'B' || current_year || LPAD(current_month::TEXT, 2, '0') || '-' || LPAD(sequence_num::TEXT, 3, '0');

    WHEN 'manual' THEN
      IF custom_input IS NULL THEN
        RAISE EXCEPTION 'Custom input required for manual generation mode';
      END IF;
      result := 'CUSTOM-' || UPPER(custom_input);

    WHEN 'range' THEN
      SELECT current_sequence INTO sequence_num FROM code_generation_settings
      WHERE setting_type = 'batch' AND generation_mode = 'range';
      result := 'R' || LPAD(sequence_num::TEXT, 4, '0');

    ELSE
      RAISE EXCEPTION 'Invalid generation mode: %', generation_mode;
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_control_number(
  batch_prefix TEXT,
  card_index INTEGER,
  generation_mode VARCHAR(30) DEFAULT 'auto',
  custom_format TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  CASE generation_mode
    WHEN 'auto' THEN
      result := REPLACE(batch_prefix, 'B', 'C') || '-' || LPAD(card_index::TEXT, 3, '0');
    WHEN 'manual' THEN
      IF custom_format IS NULL THEN
        RAISE EXCEPTION 'Custom format required for manual generation mode';
      END IF;
      result := custom_format;
    WHEN 'range' THEN
      result := 'R' || LPAD(card_index::TEXT, 6, '0');
    ELSE
      result := REPLACE(batch_prefix, 'B', 'C') || '-' || LPAD(card_index::TEXT, 3, '0');
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_passcode(
  location_code VARCHAR(3),
  generation_mode VARCHAR(30) DEFAULT 'auto',
  custom_passcode TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
  random_part TEXT;
BEGIN
  CASE generation_mode
    WHEN 'auto' THEN
      -- Generate 4-digit random number
      random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      result := UPPER(location_code) || random_part;
    WHEN 'manual' THEN
      IF custom_passcode IS NULL THEN
        RAISE EXCEPTION 'Custom passcode required for manual generation mode';
      END IF;
      result := UPPER(custom_passcode);
    WHEN 'range' THEN
      -- For range mode, get next in sequence
      SELECT UPPER(location_code) || LPAD(current_sequence::TEXT, 4, '0')
      FROM code_generation_settings
      WHERE setting_type = 'passcode' AND generation_mode = 'range'
      INTO result;

      -- Increment sequence
      UPDATE code_generation_settings
      SET current_sequence = current_sequence + 1
      WHERE setting_type = 'passcode' AND generation_mode = 'range';

    ELSE
      random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      result := UPPER(location_code) || random_part;
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize codes (add/remove dashes automatically)
CREATE OR REPLACE FUNCTION normalize_code(input_code TEXT, code_type VARCHAR(20))
RETURNS TEXT AS $$
DECLARE
  clean_code TEXT;
  result TEXT;
BEGIN
  -- Remove all dashes and spaces first
  clean_code := UPPER(REGEXP_REPLACE(input_code, '[^A-Z0-9]', '', 'g'));

  CASE code_type
    WHEN 'control' THEN
      -- Format: CYYYYMM-NNN or CNNN-NNN
      IF LENGTH(clean_code) >= 6 THEN
        result := SUBSTR(clean_code, 1, LENGTH(clean_code)-3) || '-' || SUBSTR(clean_code, -3);
      ELSE
        result := clean_code;
      END IF;

    WHEN 'batch' THEN
      -- Format: BYYYYMM-NNN
      IF LENGTH(clean_code) >= 6 THEN
        result := SUBSTR(clean_code, 1, LENGTH(clean_code)-3) || '-' || SUBSTR(clean_code, -3);
      ELSE
        result := clean_code;
      END IF;

    WHEN 'passcode' THEN
      -- Format: LLLNNNN (no dashes for passcodes)
      result := clean_code;

    ELSE
      result := clean_code;
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to increment system version and notify changes
CREATE OR REPLACE FUNCTION increment_system_version(component_name VARCHAR(50), description TEXT DEFAULT '')
RETURNS INTEGER AS $$
DECLARE
  new_version INTEGER;
BEGIN
  UPDATE system_versions
  SET
    version_number = version_number + 1,
    change_description = description,
    created_at = NOW()
  WHERE component = component_name
  RETURNING version_number INTO new_version;

  IF new_version IS NULL THEN
    INSERT INTO system_versions (component, version_number, change_description)
    VALUES (component_name, 1, description)
    RETURNING version_number INTO new_version;
  END IF;

  RETURN new_version;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic version increment
CREATE OR REPLACE FUNCTION trigger_system_version_update()
RETURNS TRIGGER AS $$
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'cards' THEN
      PERFORM increment_system_version('cards', 'Cards data updated');
    WHEN 'card_batches' THEN
      PERFORM increment_system_version('batches', 'Batch data updated');
    WHEN 'code_generation_settings' THEN
      PERFORM increment_system_version('settings', 'Code generation settings updated');
    WHEN 'location_codes' THEN
      PERFORM increment_system_version('codes', 'Location codes updated');
  END CASE;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER cards_version_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cards
  FOR EACH ROW EXECUTE FUNCTION trigger_system_version_update();

CREATE TRIGGER batches_version_trigger
  AFTER INSERT OR UPDATE OR DELETE ON card_batches
  FOR EACH ROW EXECUTE FUNCTION trigger_system_version_update();

CREATE TRIGGER settings_version_trigger
  AFTER INSERT OR UPDATE OR DELETE ON code_generation_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_system_version_update();

CREATE TRIGGER location_codes_version_trigger
  AFTER INSERT OR UPDATE OR DELETE ON location_codes
  FOR EACH ROW EXECUTE FUNCTION trigger_system_version_update();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_code_generation_settings_type ON code_generation_settings(setting_type, generation_mode);
CREATE INDEX IF NOT EXISTS idx_location_codes_active ON location_codes(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_card_code_history_card ON card_code_history(card_id, created_at);
CREATE INDEX IF NOT EXISTS idx_system_versions_component ON system_versions(component);
CREATE INDEX IF NOT EXISTS idx_user_session_state_user ON user_session_state(user_id, component_name);

-- Enable RLS
ALTER TABLE code_generation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_code_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_session_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin access to code generation settings" ON code_generation_settings FOR ALL USING (true);
CREATE POLICY "Public read access to location codes" ON location_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write access to location codes" ON location_codes FOR ALL USING (true);
CREATE POLICY "Admin access to card code history" ON card_code_history FOR ALL USING (true);
CREATE POLICY "Public read access to system versions" ON system_versions FOR SELECT USING (true);
CREATE POLICY "User access to own session state" ON user_session_state FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON code_generation_settings TO anon, authenticated;
GRANT ALL ON location_codes TO anon, authenticated;
GRANT ALL ON card_code_history TO anon, authenticated;
GRANT ALL ON system_versions TO anon, authenticated;
GRANT ALL ON user_session_state TO anon, authenticated;