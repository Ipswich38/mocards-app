-- Fix passcode field length to support location-based passcodes
-- Safe method: Drop view, alter column, recreate view

-- Step 1: Drop the enhanced_card_view temporarily
DROP VIEW IF EXISTS enhanced_card_view;

-- Step 2: Increase passcode field length to accommodate location-based passcodes
-- Location code (3 chars) + incomplete passcode (4 digits) = 7 characters total
ALTER TABLE cards ALTER COLUMN passcode TYPE VARCHAR(10);

-- Step 3: Recreate the enhanced_card_view
CREATE OR REPLACE VIEW enhanced_card_view AS
SELECT
    c.*,
    cb.batch_number,
    cb.batch_metadata,
    mc.clinic_name,
    mc.clinic_code,
    lca.assigned_at as location_assigned_at,
    lca.assigned_by as location_assigned_by,
    (
        SELECT COUNT(*)
        FROM card_perks cp
        WHERE cp.card_id = c.id AND cp.claimed = false
    ) as available_perks_count,
    (
        SELECT COUNT(*)
        FROM card_perks cp
        WHERE cp.card_id = c.id AND cp.claimed = true
    ) as claimed_perks_count
FROM cards c
LEFT JOIN card_batches cb ON c.batch_id = cb.id
LEFT JOIN mocards_clinics mc ON c.assigned_clinic_id = mc.id
LEFT JOIN location_code_assignments lca ON c.id = lca.card_id;

-- Step 4: Grant permissions on recreated view
GRANT SELECT ON enhanced_card_view TO authenticated;

-- Verification: Check the new column type
SELECT
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cards' AND column_name = 'passcode';

SELECT 'Passcode field length fixed successfully! Ready for location-based passcodes.' as status;