-- MOCARDS DATABASE RESET (FIXED)
-- Run this in Supabase SQL Editor

-- 1. First, let's see what perk types are allowed
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'chk_perk_type';

-- 2. Clear all data (preserves table structure)
DELETE FROM perk_redemptions;
DELETE FROM appointments;
DELETE FROM cards;
DELETE FROM clinics;
DELETE FROM perks;

-- 3. Check existing perk type values first
-- Let's check what the valid enum values are for perk type
SELECT
    t.typname,
    e.enumlabel
FROM pg_type t
   JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'perk_type'
ORDER BY e.enumsortorder;

-- 4. If the above query shows different values, use those instead
-- For now, let's try with simpler type names that might be accepted:

INSERT INTO perks (name, description, type, value, is_active, valid_for, requires_approval) VALUES
('Free Dental Cleaning', 'Professional dental cleaning and polishing service', 'cleaning', 1500, true, 365, false),
('Free Consultation', 'Comprehensive dental examination and consultation', 'consultation', 800, true, 365, false),
('Free X-Ray', 'Digital dental X-ray imaging service', 'xray', 600, true, 365, false),
('Fluoride Treatment', 'Professional fluoride application for cavity prevention', 'treatment', 400, true, 365, false),
('Oral Health Education', 'Professional guidance on oral hygiene and dental care', 'education', 300, true, 365, false);

-- 5. If the above fails, try these alternative type names:
-- DELETE FROM perks;
-- INSERT INTO perks (name, description, type, value, is_active, valid_for, requires_approval) VALUES
-- ('Free Dental Cleaning', 'Professional dental cleaning and polishing service', 'dental', 1500, true, 365, false),
-- ('Free Consultation', 'Comprehensive dental examination and consultation', 'exam', 800, true, 365, false),
-- ('Free X-Ray', 'Digital dental X-ray imaging service', 'imaging', 600, true, 365, false),
-- ('Fluoride Treatment', 'Professional fluoride application for cavity prevention', 'preventive', 400, true, 365, false),
-- ('Oral Health Education', 'Professional guidance on oral hygiene and dental care', 'education', 300, true, 365, false);

-- 6. Verify reset
SELECT
  (SELECT COUNT(*) FROM cards) as cards_count,
  (SELECT COUNT(*) FROM clinics) as clinics_count,
  (SELECT COUNT(*) FROM appointments) as appointments_count,
  (SELECT COUNT(*) FROM perk_redemptions) as redemptions_count,
  (SELECT COUNT(*) FROM perks) as perks_count;

-- 7. Show all perks to verify they were created correctly
SELECT id, name, type, value, is_active FROM perks ORDER BY name;