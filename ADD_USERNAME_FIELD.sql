-- ================================================================
-- ADD USERNAME FIELD TO CLINICS TABLE
-- Simple addition to existing schema for clinic usernames
-- ================================================================

-- Add username field to clinics table (temporary username support)
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Add index for username lookups
CREATE INDEX IF NOT EXISTS idx_clinics_username ON clinics(username);

-- Update existing clinics to have a default username based on clinic_code
UPDATE clinics
SET username = LOWER(clinic_code)
WHERE username IS NULL;

-- Show updated table structure
SELECT 'CLINICS TABLE UPDATED:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'clinics' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ USERNAME FIELD ADDED TO CLINICS TABLE' as success_message;