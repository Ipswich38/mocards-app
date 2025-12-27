-- MOCARDS DATABASE RESET (FINAL CORRECTED VERSION)
-- Run this in Supabase SQL Editor

-- 1. Clear all data (preserves table structure)
DELETE FROM perk_redemptions;
DELETE FROM appointments;
DELETE FROM cards;
DELETE FROM clinics;
DELETE FROM perks;

-- 2. Restore default perks using correct schema field order
-- Schema: id, name, description, type, value, is_active, valid_for, requires_approval, created_at, updated_at, duration
INSERT INTO perks (name, description, type, value, is_active, valid_for, requires_approval) VALUES
('Free Dental Cleaning', 'Professional dental cleaning and polishing service', 'dental_cleaning', 1500, true, 365, false),
('Free Consultation', 'Comprehensive dental examination and consultation', 'consultation', 800, true, 365, false),
('Free X-Ray', 'Digital dental X-ray imaging service', 'xray', 600, true, 365, false),
('Fluoride Treatment', 'Professional fluoride application for cavity prevention', 'treatment', 400, true, 365, false),
('Dental Discount', 'Special discount on dental procedures', 'discount', 300, true, 365, false);

-- 3. Verify reset
SELECT
  (SELECT COUNT(*) FROM cards) as cards_count,
  (SELECT COUNT(*) FROM clinics) as clinics_count,
  (SELECT COUNT(*) FROM appointments) as appointments_count,
  (SELECT COUNT(*) FROM perk_redemptions) as redemptions_count,
  (SELECT COUNT(*) FROM perks) as perks_count;

-- 4. Show created perks to verify
SELECT id, name, type, value, is_active FROM perks ORDER BY name;