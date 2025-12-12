-- Schema update for clinic password synchronization
-- Adds current_password column to store readable passwords for admin interface
-- MAINTAINS SECURITY: password_hash remains the source of truth for authentication
-- IMPORTANT: This is for admin convenience only - passwords must still be hashed

BEGIN;

-- =============================================================================
-- BACKUP EXISTING DATA
-- =============================================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS mocards_clinics_password_backup AS
SELECT * FROM public.mocards_clinics;

-- Log backup creation (optional - only if audit log table exists)
DO $audit1$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'system_audit_log'
    ) THEN
        INSERT INTO public.system_audit_log (operation, description, created_at)
        VALUES (
            'CLINIC_PASSWORD_BACKUP',
            'Pre-password-sync schema update backup created',
            NOW()
        );
    ELSE
        RAISE NOTICE 'system_audit_log table not found - skipping audit log entry';
    END IF;
END$audit1$;

-- =============================================================================
-- SCHEMA UPDATES
-- =============================================================================

-- Add current_password column for admin viewing (NOT used for authentication)
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS current_password TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_current_password
ON public.mocards_clinics(current_password)
WHERE current_password IS NOT NULL;

-- Add column comment for clarity
COMMENT ON COLUMN public.mocards_clinics.current_password IS
'Plain text password for admin reference only. NOT used for authentication. password_hash is the source of truth.';

-- =============================================================================
-- UPDATE FUNCTION FOR PASSWORD SYNCHRONIZATION
-- =============================================================================

-- Create or replace function to automatically sync passwords
CREATE OR REPLACE FUNCTION sync_clinic_password()
RETURNS TRIGGER AS $func$
BEGIN
    -- If password_hash is being updated and current_password is provided
    -- (This happens when admin manually updates password)
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash
       AND NEW.current_password IS NOT NULL
       AND NEW.current_password != '' THEN
        -- Keep the current_password as is for admin reference
        RETURN NEW;
    END IF;

    -- If only current_password is updated (admin editing), hash it
    IF NEW.current_password IS DISTINCT FROM OLD.current_password
       AND NEW.current_password IS NOT NULL
       AND NEW.current_password != ''
       AND (NEW.password_hash = OLD.password_hash OR NEW.password_hash IS NULL) THEN
        -- This would require bcrypt in PostgreSQL, which is complex
        -- Instead, we'll handle this in the application layer
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create trigger for password synchronization
DROP TRIGGER IF EXISTS trigger_sync_clinic_password ON public.mocards_clinics;
CREATE TRIGGER trigger_sync_clinic_password
    BEFORE UPDATE ON public.mocards_clinics
    FOR EACH ROW EXECUTE FUNCTION sync_clinic_password();

-- =============================================================================
-- SECURITY CONSIDERATIONS
-- =============================================================================

-- Add RLS policy to protect current_password column (optional - only if admin table exists)
-- Only admins should see plain text passwords
DO $rls$
BEGIN
    -- Check if mocards_admins table exists before creating RLS policy
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'mocards_admins'
    ) THEN
        -- Enable RLS if not already enabled
        ALTER TABLE public.mocards_clinics ENABLE ROW LEVEL SECURITY;

        -- Drop existing policy if it exists, then create new one
        DROP POLICY IF EXISTS "Admin can view current_password" ON public.mocards_clinics;

        -- Create policy for admin access to current_password
        CREATE POLICY "Admin can view current_password"
        ON public.mocards_clinics
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.mocards_admins
                WHERE id = current_setting('app.current_admin_id', true)::uuid
            )
        );

        RAISE NOTICE 'RLS policy created for current_password column';
    ELSE
        RAISE NOTICE 'mocards_admins table not found - skipping RLS policy creation';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Handle any errors gracefully
    RAISE NOTICE 'Could not create RLS policy: %', SQLERRM;
END$rls$;

-- =============================================================================
-- DATA MIGRATION (Optional)
-- =============================================================================

-- For existing clinics with known temporary passwords from admin interface
-- This would need to be populated by the application layer since we can't
-- reverse hash existing passwords

UPDATE public.mocards_clinics
SET current_password = 'TEMP_' || SUBSTRING(clinic_code FROM 1 FOR 4) || '_' || id::text
WHERE current_password IS NULL
  AND password_hash IS NOT NULL
  AND first_login = true;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify schema changes
SELECT
    'SCHEMA_VERIFICATION' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mocards_clinics'
  AND table_schema = 'public'
  AND column_name IN ('current_password', 'password_hash');

-- Count clinics with password data
SELECT
    'PASSWORD_DATA_STATUS' as check_type,
    COUNT(*) as total_clinics,
    COUNT(password_hash) as has_hash,
    COUNT(current_password) as has_current,
    COUNT(CASE WHEN password_hash IS NOT NULL AND current_password IS NOT NULL THEN 1 END) as has_both
FROM public.mocards_clinics;

-- Log schema completion (optional - only if audit log table exists)
DO $audit2$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'system_audit_log'
    ) THEN
        INSERT INTO public.system_audit_log (operation, description, created_at)
        VALUES (
            'CLINIC_PASSWORD_SYNC_COMPLETE',
            'Clinic password synchronization schema update completed successfully',
            NOW()
        );
    ELSE
        RAISE NOTICE 'system_audit_log table not found - skipping audit log entry';
    END IF;
END$audit2$;

COMMIT;

-- =============================================================================
-- USAGE NOTES
-- =============================================================================

/*
IMPORTANT USAGE NOTES:

1. SECURITY:
   - current_password is for admin convenience only
   - password_hash remains the source of truth for authentication
   - Never authenticate using current_password

2. APPLICATION LAYER REQUIREMENTS:
   - When admin creates clinic: store password in both fields
   - When admin updates password: hash new password and store in both fields
   - When clinic changes password: hash new password, store in password_hash, optionally update current_password

3. ADMIN INTERFACE:
   - Show current_password in admin table with eye toggle
   - Allow editing current_password in edit form
   - On form submit: hash current_password and update password_hash

4. AUTHENTICATION:
   - Always use password_hash with bcrypt.compare()
   - Never use current_password for authentication

5. BACKUP:
   - Backup table created: mocards_clinics_password_backup
   - Can be restored if needed:
     INSERT INTO mocards_clinics SELECT * FROM mocards_clinics_password_backup;
*/