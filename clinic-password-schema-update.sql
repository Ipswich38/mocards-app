-- Schema update for clinic password management
-- Adds password change tracking to mocards_clinics table
-- INCLUDES DATA PRESERVATION SAFEGUARDS FOR ALL 10,000+ CARDS

-- =============================================================================
-- DATA PRESERVATION BACKUP
-- =============================================================================
-- Create backup tables before any modifications
CREATE TABLE IF NOT EXISTS cards_backup_before_update AS
SELECT * FROM public.cards;

CREATE TABLE IF NOT EXISTS mocards_clinics_backup_before_update AS
SELECT * FROM public.mocards_clinics;

-- Log the backup creation
INSERT INTO public.system_audit_log (operation, description, created_at)
VALUES ('BACKUP_CREATED', 'Pre-update backup created for cards and clinics tables', NOW())
ON CONFLICT DO NOTHING;

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

-- Create an index on password_must_be_changed for performance
CREATE INDEX IF NOT EXISTS idx_mocards_clinics_password_change
ON public.mocards_clinics(password_must_be_changed)
WHERE password_must_be_changed = true;

-- Update existing clinics to require password change if they don't have this field set
UPDATE public.mocards_clinics
SET password_must_be_changed = true, first_login = true
WHERE password_must_be_changed IS NULL;

-- Add comment to the table
COMMENT ON COLUMN public.mocards_clinics.password_must_be_changed
IS 'Indicates if the clinic must change their password on next login (for temporary passwords)';

COMMENT ON COLUMN public.mocards_clinics.last_password_change
IS 'Timestamp of when the clinic last changed their password';

COMMENT ON COLUMN public.mocards_clinics.first_login
IS 'Indicates if this is the clinics first login (used for password change flow)';

-- =============================================================================
-- DATA INTEGRITY VERIFICATION
-- =============================================================================
-- Verify no cards were lost during the update
DO $$
DECLARE
    original_count INTEGER;
    current_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO original_count FROM cards_backup_before_update;
    SELECT COUNT(*) INTO current_count FROM public.cards;

    IF original_count != current_count THEN
        RAISE EXCEPTION 'DATA INTEGRITY ERROR: Card count mismatch. Original: %, Current: %',
                       original_count, current_count;
    END IF;

    -- Log successful verification
    INSERT INTO public.system_audit_log (operation, description, created_at)
    VALUES ('DATA_VERIFIED',
           format('Schema update completed. All %s cards preserved.', current_count),
           NOW());

    RAISE NOTICE 'DATA INTEGRITY VERIFIED: All % cards preserved successfully', current_count;
END $$;

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Final verification summary
SELECT
    'VERIFICATION_COMPLETE' as status,
    (SELECT COUNT(*) FROM public.cards) as total_cards_preserved,
    (SELECT COUNT(*) FROM public.mocards_clinics) as total_clinics,
    NOW() as verification_timestamp;