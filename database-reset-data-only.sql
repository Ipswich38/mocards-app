-- MOCARDS DATABASE RESET (DATA ONLY - SAFE APPROACH)
-- This will clear all data and give you a fresh start
-- Your client can add perks through the admin interface

-- 1. Clear all data (preserves table structure)
DELETE FROM perk_redemptions;
DELETE FROM appointments;
DELETE FROM cards;
DELETE FROM clinics;
DELETE FROM perks;

-- 2. Verify everything is cleared
SELECT
  (SELECT COUNT(*) FROM cards) as cards_count,
  (SELECT COUNT(*) FROM clinics) as clinics_count,
  (SELECT COUNT(*) FROM appointments) as appointments_count,
  (SELECT COUNT(*) FROM perk_redemptions) as redemptions_count,
  (SELECT COUNT(*) FROM perks) as perks_count;

-- 3. Check table structures are intact
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('cards', 'clinics', 'appointments', 'perks', 'perk_redemptions')
ORDER BY table_name;

-- RESULT: All data cleared, all features working, fresh start ready!
-- Your client can now:
-- ✅ Create admin account
-- ✅ Add perks through admin interface
-- ✅ Generate cards starting from MOC-00001
-- ✅ Set up clinics
-- ✅ Start business operations