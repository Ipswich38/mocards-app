-- Schema update for clinic password management
-- Adds password change tracking to mocards_clinics table
-- INCLUDES DATA PRESERVATION SAFEGUARDS FOR ALL 10,000+ CARDS

BEGIN;

-- =============================================================================
-- REQUIRED TABLES CREATION
-- =============================================================================

-- Create system audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    performed_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_system_audit_log_created_at
ON public.system_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_log_operation
ON public.system_audit_log(operation);

-- =============================================================================
-- DATA PRESERVATION BACKUP
-- =============================================================================

-- Create backup tables before any modifications
CREATE TABLE IF NOT EXISTS cards_backup_before_password_update AS
SELECT * FROM public.cards;

CREATE TABLE IF NOT EXISTS mocards_clinics_backup_before_password_update AS
SELECT * FROM public.mocards_clinics;

-- Log the backup creation
INSERT INTO public.system_audit_log (operation, description, created_at)
VALUES ('BACKUP_CREATED', 'Pre-update backup created for cards and clinics tables', NOW());

-- =============================================================================
-- PASSWORD MANAGEMENT SCHEMA UPDATES
-- =============================================================================

-- Add password change tracking field if it doesn't exist
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS password_must_be_changed BOOLEAN DEFAULT false;

-- Add password change history fields
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add field to track if this is the first login
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;

-- Add missing region and location columns
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS region VARCHAR(255);

ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS location_code VARCHAR(10);

-- Add password hash field if it doesn't exist (required for bcrypt)
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create an index on password_must_be_changed for performance
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_password_change
ON public.mocards_clinics(password_must_be_changed)
WHERE password_must_be_changed = true;

-- Create index on location_code for regional searches
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_location_code
ON public.mocards_clinics(location_code)
WHERE location_code IS NOT NULL;

-- Create index on region for regional queries
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_region
ON public.mocards_clinics(region)
WHERE region IS NOT NULL;

-- =============================================================================
-- UPDATE EXISTING CLINICS
-- =============================================================================

-- Update existing clinics to require password change if they don't have this field set
UPDATE public.mocards_clinics
SET password_must_be_changed = true, first_login = true
WHERE password_must_be_changed IS NULL;

-- Set default password_hash for existing clinics if they don't have one
-- Note: This is a placeholder - real passwords should be set through the application
UPDATE public.mocards_clinics
SET password_hash = '$2a$10$defaulthashfortemporarypassword'
WHERE password_hash IS NULL OR password_hash = '';

-- =============================================================================
-- PASSWORD SECURITY FUNCTIONS
-- =============================================================================

-- Function to validate password strength
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    suggestions TEXT[]
) AS $$
BEGIN
    -- Check minimum length
    IF LENGTH(password_text) < 8 THEN
        RETURN QUERY SELECT false, 'Password must be at least 8 characters long',
            ARRAY['Use at least 8 characters', 'Include uppercase and lowercase letters', 'Add numbers and special characters'];
        RETURN;
    END IF;

    -- Check for uppercase letter
    IF password_text !~ '[A-Z]' THEN
        RETURN QUERY SELECT false, 'Password must contain at least one uppercase letter',
            ARRAY['Add uppercase letters (A-Z)', 'Mix case for better security'];
        RETURN;
    END IF;

    -- Check for lowercase letter
    IF password_text !~ '[a-z]' THEN
        RETURN QUERY SELECT false, 'Password must contain at least one lowercase letter',
            ARRAY['Add lowercase letters (a-z)', 'Mix case for better security'];
        RETURN;
    END IF;

    -- Check for number
    IF password_text !~ '[0-9]' THEN
        RETURN QUERY SELECT false, 'Password must contain at least one number',
            ARRAY['Add numbers (0-9)', 'Use a mix of letters and numbers'];
        RETURN;
    END IF;

    -- Password meets all requirements
    RETURN QUERY SELECT true, NULL, ARRAY['Password meets security requirements'];
END;
$$ LANGUAGE plpgsql;

-- Function to log password changes
CREATE OR REPLACE FUNCTION public.log_password_change(
    clinic_id UUID,
    changed_by VARCHAR(255),
    change_reason TEXT DEFAULT 'Password update'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.system_audit_log (
        operation,
        description,
        performed_by,
        details
    ) VALUES (
        'PASSWORD_CHANGED',
        'Clinic password was updated',
        changed_by,
        jsonb_build_object(
            'clinic_id', clinic_id,
            'change_reason', change_reason,
            'timestamp', NOW()
        )
    ) RETURNING id INTO log_id;

    -- Update the clinic's last password change timestamp
    UPDATE public.mocards_clinics
    SET last_password_change = NOW(),
        password_must_be_changed = false,
        first_login = false
    WHERE id = clinic_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PASSWORD CHANGE TRIGGERS
-- =============================================================================

-- Function to trigger password change logging
CREATE OR REPLACE FUNCTION public.trigger_password_change_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Log password changes automatically
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        PERFORM public.log_password_change(
            NEW.id,
            'system_trigger',
            'Password hash updated'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password change logging
DROP TRIGGER IF EXISTS clinic_password_change_trigger ON public.mocards_clinics;
CREATE TRIGGER clinic_password_change_trigger
    AFTER UPDATE ON public.mocards_clinics
    FOR EACH ROW
    WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash)
    EXECUTE FUNCTION public.trigger_password_change_log();

-- =============================================================================
-- CLINIC AUTHENTICATION FUNCTIONS
-- =============================================================================

-- Function to authenticate clinic login
CREATE OR REPLACE FUNCTION public.authenticate_clinic(
    clinic_code_input VARCHAR(20),
    password_input TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    clinic_id UUID,
    clinic_name TEXT,
    message TEXT,
    requires_password_change BOOLEAN
) AS $$
DECLARE
    clinic_record RECORD;
BEGIN
    -- Get clinic by code
    SELECT id, clinic_name, password_hash, password_must_be_changed, status
    INTO clinic_record
    FROM public.mocards_clinics
    WHERE clinic_code = clinic_code_input;

    -- Check if clinic exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid clinic code', false;
        RETURN;
    END IF;

    -- Check if clinic is active
    IF clinic_record.status != 'active' THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Clinic account is not active', false;
        RETURN;
    END IF;

    -- Note: Password verification should be done in the application layer using bcrypt
    -- This function returns the necessary information for the application to verify

    RETURN QUERY SELECT
        true,
        clinic_record.id,
        clinic_record.clinic_name,
        'Clinic found - verify password in application',
        clinic_record.password_must_be_changed;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DATA INTEGRITY AND VALIDATION
-- =============================================================================

-- Function to check clinic data integrity
CREATE OR REPLACE FUNCTION public.check_clinic_integrity()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    count_affected INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check for clinics without password hash
    RETURN QUERY
    SELECT
        'Missing Password Hash'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Clinics without password hash'::TEXT
    FROM public.mocards_clinics
    WHERE password_hash IS NULL OR password_hash = '';

    -- Check for clinics requiring password change
    RETURN QUERY
    SELECT
        'Pending Password Changes'::TEXT,
        'INFO'::TEXT,
        COUNT(*)::INTEGER,
        'Clinics that must change password on next login'::TEXT
    FROM public.mocards_clinics
    WHERE password_must_be_changed = true;

    -- Check for duplicate clinic codes
    RETURN QUERY
    SELECT
        'Duplicate Clinic Codes'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Duplicate clinic codes found'::TEXT
    FROM (
        SELECT clinic_code, COUNT(*) as code_count
        FROM public.mocards_clinics
        GROUP BY clinic_code
        HAVING COUNT(*) > 1
    ) duplicates;

END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- REGIONAL CLINIC MANAGEMENT
-- =============================================================================

-- Create view for regional clinic statistics
CREATE OR REPLACE VIEW public.regional_clinic_stats AS
SELECT
    region,
    COUNT(*) as total_clinics,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clinics,
    COUNT(CASE WHEN password_must_be_changed = true THEN 1 END) as pending_password_changes,
    MIN(created_at) as first_clinic_date,
    MAX(last_password_change) as latest_password_change
FROM public.mocards_clinics
WHERE region IS NOT NULL
GROUP BY region
ORDER BY total_clinics DESC;

-- =============================================================================
-- FINAL VERIFICATION AND CLEANUP
-- =============================================================================

-- Add table comments
COMMENT ON COLUMN public.mocards_clinics.password_must_be_changed
IS 'Flag to indicate if clinic must change password on next login';

COMMENT ON COLUMN public.mocards_clinics.last_password_change
IS 'Timestamp of last password change for security auditing';

COMMENT ON COLUMN public.mocards_clinics.first_login
IS 'Flag to indicate if this is the clinic''s first login';

COMMENT ON COLUMN public.mocards_clinics.region
IS 'Geographic region for clinic organization';

COMMENT ON COLUMN public.mocards_clinics.location_code
IS 'Location code for regional identification';

COMMENT ON COLUMN public.mocards_clinics.password_hash
IS 'Bcrypt hashed password for secure authentication';

-- Run integrity check
SELECT * FROM public.check_clinic_integrity();

-- Update system audit log
INSERT INTO public.system_audit_log (operation, description, created_at)
VALUES ('PASSWORD_SCHEMA_UPDATED', 'Clinic password management system successfully updated with security features', NOW());

-- Display final statistics
SELECT
    'PASSWORD SCHEMA UPDATE COMPLETED' as status,
    COUNT(*) as total_clinics,
    COUNT(CASE WHEN password_must_be_changed = true THEN 1 END) as clinics_requiring_password_change,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clinics,
    COUNT(CASE WHEN region IS NOT NULL THEN 1 END) as clinics_with_region,
    COUNT(CASE WHEN location_code IS NOT NULL THEN 1 END) as clinics_with_location_code
FROM public.mocards_clinics;

-- Log completion
INSERT INTO public.system_audit_log (operation, description, details)
VALUES (
    'CLINIC_PASSWORD_SYSTEM_DEPLOYED',
    'Complete clinic password management system with security features successfully deployed',
    jsonb_build_object(
        'features', array[
            'password_strength_validation',
            'change_tracking',
            'audit_logging',
            'regional_management',
            'security_triggers',
            'data_integrity_checks'
        ],
        'schema_version', '2.1',
        'deployment_date', NOW()
    )
);

COMMIT;