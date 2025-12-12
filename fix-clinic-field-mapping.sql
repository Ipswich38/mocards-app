-- Fix Clinic Field Mapping Schema Migration
-- Ensures database schema matches the field mapping fixes in the application
-- SAFE EXECUTION - Checks column existence and handles data migration

BEGIN;

-- =============================================================================
-- ANALYZE CURRENT SCHEMA STATE
-- =============================================================================

-- Check current column structure
SELECT
    '🔍 CURRENT CLINIC TABLE STRUCTURE' as info,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mocards_clinics'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Count existing clinics to ensure no data loss
SELECT
    '📊 PRE-MIGRATION DATA COUNT' as section,
    COUNT(*) as total_clinics,
    COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as clinics_with_contact_email,
    COUNT(CASE WHEN contact_phone IS NOT NULL THEN 1 END) as clinics_with_contact_phone
FROM public.mocards_clinics;

-- =============================================================================
-- BACKUP EXISTING DATA
-- =============================================================================

-- Create backup table for safety
CREATE TABLE IF NOT EXISTS mocards_clinics_backup_field_migration AS
SELECT * FROM public.mocards_clinics;

-- Log the backup
INSERT INTO public.system_audit_log (operation, description, created_at)
SELECT 'BACKUP_CREATED', 'Pre-field-migration backup created for mocards_clinics table', NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_log')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SCHEMA MIGRATION STRATEGY
-- =============================================================================

-- Strategy: Add new columns if they don't exist, migrate data, then optionally drop old columns

-- Add 'email' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mocards_clinics'
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.mocards_clinics ADD COLUMN email VARCHAR(255);
        RAISE NOTICE '✅ Added email column to mocards_clinics';
    ELSE
        RAISE NOTICE 'ℹ️  Column email already exists in mocards_clinics';
    END IF;
END $$;

-- Add 'phone' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mocards_clinics'
        AND column_name = 'phone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.mocards_clinics ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE '✅ Added phone column to mocards_clinics';
    ELSE
        RAISE NOTICE 'ℹ️  Column phone already exists in mocards_clinics';
    END IF;
END $$;

-- =============================================================================
-- DATA MIGRATION
-- =============================================================================

-- Migrate data from contact_email to email if both columns exist and email is empty
DO $$
DECLARE
    contact_email_exists BOOLEAN;
    email_exists BOOLEAN;
    migration_count INTEGER;
BEGIN
    -- Check if both columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mocards_clinics' AND column_name = 'contact_email'
    ) INTO contact_email_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mocards_clinics' AND column_name = 'email'
    ) INTO email_exists;

    IF contact_email_exists AND email_exists THEN
        -- Migrate data from contact_email to email where email is null
        UPDATE public.mocards_clinics
        SET email = contact_email
        WHERE contact_email IS NOT NULL
        AND (email IS NULL OR email = '');

        GET DIAGNOSTICS migration_count = ROW_COUNT;
        RAISE NOTICE '✅ Migrated % contact_email values to email column', migration_count;
    ELSE
        RAISE NOTICE 'ℹ️  Skipping email migration - required columns not found';
    END IF;
END $$;

-- Migrate data from contact_phone to phone if both columns exist and phone is empty
DO $$
DECLARE
    contact_phone_exists BOOLEAN;
    phone_exists BOOLEAN;
    migration_count INTEGER;
BEGIN
    -- Check if both columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mocards_clinics' AND column_name = 'contact_phone'
    ) INTO contact_phone_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mocards_clinics' AND column_name = 'phone'
    ) INTO phone_exists;

    IF contact_phone_exists AND phone_exists THEN
        -- Migrate data from contact_phone to phone where phone is null
        UPDATE public.mocards_clinics
        SET phone = contact_phone
        WHERE contact_phone IS NOT NULL
        AND (phone IS NULL OR phone = '');

        GET DIAGNOSTICS migration_count = ROW_COUNT;
        RAISE NOTICE '✅ Migrated % contact_phone values to phone column', migration_count;
    ELSE
        RAISE NOTICE 'ℹ️  Skipping phone migration - required columns not found';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION & FINAL STATUS
-- =============================================================================

-- Verify the migration
SELECT
    '📊 POST-MIGRATION DATA COUNT' as section,
    COUNT(*) as total_clinics,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as clinics_with_email,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as clinics_with_phone,
    COUNT(CASE WHEN contact_email IS NOT NULL AND contact_email != '' THEN 1 END) as clinics_with_contact_email,
    COUNT(CASE WHEN contact_phone IS NOT NULL AND contact_phone != '' THEN 1 END) as clinics_with_contact_phone
FROM public.mocards_clinics;

-- Show final schema structure
SELECT
    '🎯 FINAL CLINIC TABLE STRUCTURE' as info,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'mocards_clinics'
    AND table_schema = 'public'
    AND column_name IN ('email', 'phone', 'contact_email', 'contact_phone')
ORDER BY column_name;

-- =============================================================================
-- NOTES FOR FUTURE CLEANUP (OPTIONAL)
-- =============================================================================

-- NOTE: The old 'contact_email' and 'contact_phone' columns are preserved for safety.
-- Once you verify everything works correctly, you can optionally drop them with:
--
-- ALTER TABLE public.mocards_clinics DROP COLUMN IF EXISTS contact_email;
-- ALTER TABLE public.mocards_clinics DROP COLUMN IF EXISTS contact_phone;
--
-- But it's safer to keep them for now until you're 100% confident the migration worked.

COMMIT;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT
    '🎉 MIGRATION COMPLETE' as status,
    'Clinic field mapping has been fixed. Application should now work correctly.' as message,
    'Next step: Test clinic creation and login in the application.' as action;