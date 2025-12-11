-- Generate 10,000 Virtual Cards for MOC System V2.0
-- This script creates 10,000 pre-generated cards with format MOC-XX-XX-NNNNN

-- First, ensure the schema is properly set up
\i complete-moc-schema-v2.sql

-- Function to generate a random passcode (6 digits)
CREATE OR REPLACE FUNCTION generate_random_passcode()
RETURNS VARCHAR(6) AS $$
BEGIN
  RETURN LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Delete any existing V2 cards to avoid conflicts
DELETE FROM cards WHERE migration_version = 2;

-- Insert 10,000 cards with sequential numbering
INSERT INTO cards (
  passcode,
  control_number_v2,
  card_number,
  location_code_v2,
  clinic_code_v2,
  is_activated,
  status,
  migration_version,
  holder_name,
  phone_number,
  email,
  created_at,
  updated_at
)
SELECT
  generate_random_passcode() as passcode,
  'MOC-XX-XX-' || LPAD(series.card_num::TEXT, 5, '0') as control_number_v2,
  series.card_num as card_number,
  NULL as location_code_v2,  -- Will be set during activation
  NULL as clinic_code_v2,    -- Will be set during activation
  false as is_activated,
  'pending' as status,
  2 as migration_version,
  'Virtual Card #' || series.card_num as holder_name,
  NULL as phone_number,
  NULL as email,
  NOW() as created_at,
  NOW() as updated_at
FROM generate_series(1, 10000) as series(card_num);

-- Verify the generation
SELECT
  COUNT(*) as total_cards,
  COUNT(CASE WHEN is_activated = false THEN 1 END) as unactivated_cards,
  COUNT(CASE WHEN migration_version = 2 THEN 1 END) as v2_cards,
  MIN(card_number) as min_card_number,
  MAX(card_number) as max_card_number,
  MIN(control_number_v2) as first_control_number,
  MAX(control_number_v2) as last_control_number
FROM cards
WHERE migration_version = 2;

-- Display sample of generated cards
SELECT
  control_number_v2,
  card_number,
  status,
  is_activated,
  holder_name,
  created_at
FROM cards
WHERE migration_version = 2
ORDER BY card_number
LIMIT 10;

COMMIT;

-- Display success message
SELECT '✅ Successfully generated 10,000 virtual MOC cards with format MOC-XX-XX-NNNNN' as result;