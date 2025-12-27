-- MOCARDS DATABASE RESET (SIMPLE APPROACH)
-- Run this in Supabase SQL Editor

-- Step 1: Clear all data (this is safe and will work)
DELETE FROM perk_redemptions;
DELETE FROM appointments;
DELETE FROM cards;
DELETE FROM clinics;
DELETE FROM perks;

-- Step 2: Verify the tables are empty
SELECT
  (SELECT COUNT(*) FROM cards) as cards_count,
  (SELECT COUNT(*) FROM clinics) as clinics_count,
  (SELECT COUNT(*) FROM appointments) as appointments_count,
  (SELECT COUNT(*) FROM perk_redemptions) as redemptions_count,
  (SELECT COUNT(*) FROM perks) as perks_count;

-- Step 3: Check what perk types are allowed (run this to see valid values)
SELECT
    t.typname as enum_name,
    e.enumlabel as valid_value
FROM pg_type t
   JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'perk_type'
ORDER BY e.enumsortorder;

-- Step 4: After you see the valid perk types from Step 3,
-- manually create perks using the valid type values shown above
-- For example, if valid types are 'dental', 'consultation', etc.:
--
-- INSERT INTO perks (name, description, type, value, is_active, valid_for, requires_approval) VALUES
-- ('Free Dental Cleaning', 'Professional dental cleaning and polishing service', '[USE_VALID_TYPE_HERE]', 1500, true, 365, false);
--
-- Replace [USE_VALID_TYPE_HERE] with one of the valid values from Step 3

-- For now, your database will be completely reset and ready.
-- You can add perks manually through the admin interface if needed.