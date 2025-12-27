-- MOCARDS DATABASE RESET
-- Run this in Supabase SQL Editor

-- 1. Clear all data (preserves table structure)
DELETE FROM perk_redemptions;
DELETE FROM appointments;
DELETE FROM cards;
DELETE FROM clinics;
DELETE FROM perks;

-- 2. Restore default perks
INSERT INTO perks (type, name, description, value, is_active, valid_for, requires_approval) VALUES
('dental_cleaning', 'Free Dental Cleaning', 'Professional dental cleaning and polishing service', 1500, true, 365, false),
('consultation', 'Free Consultation', 'Comprehensive dental examination and consultation', 800, true, 365, false),
('xray', 'Free X-Ray', 'Digital dental X-ray imaging service', 600, true, 365, false),
('fluoride_treatment', 'Fluoride Treatment', 'Professional fluoride application for cavity prevention', 400, true, 365, false),
('oral_health_education', 'Oral Health Education', 'Professional guidance on oral hygiene and dental care', 300, true, 365, false);

-- 3. Verify reset
SELECT
  (SELECT COUNT(*) FROM cards) as cards_count,
  (SELECT COUNT(*) FROM clinics) as clinics_count,
  (SELECT COUNT(*) FROM appointments) as appointments_count,
  (SELECT COUNT(*) FROM perk_redemptions) as redemptions_count,
  (SELECT COUNT(*) FROM perks) as perks_count;