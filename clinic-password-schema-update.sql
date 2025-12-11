-- Schema update for clinic password management
-- Adds password change tracking to mocards_clinics table

-- Add password change tracking field if it doesn't exist
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS password_must_be_changed BOOLEAN DEFAULT false;

-- Add password change history fields
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add field to track if this is the first login
ALTER TABLE public.mocards_clinics
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;

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