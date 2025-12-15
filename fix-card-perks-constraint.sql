-- =============================================================================
-- FIX CARD PERKS CONSTRAINT VIOLATION
-- =============================================================================
-- This schema fixes the perk_type check constraint violation that occurs during card activation

BEGIN;

-- 1. First, let's check what the current constraint allows
-- (This will show us the constraint definition)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.card_perks'::regclass AND contype = 'c';

-- 2. Drop the existing check constraint if it exists
DO $$
BEGIN
    -- Try to drop the constraint (this may fail if constraint name is different)
    BEGIN
        ALTER TABLE public.card_perks DROP CONSTRAINT IF EXISTS card_perks_perk_type_check;
    EXCEPTION WHEN OTHERS THEN
        -- If that doesn't work, find and drop any perk_type check constraints
        DECLARE
            constraint_name TEXT;
        BEGIN
            SELECT conname INTO constraint_name
            FROM pg_constraint
            WHERE conrelid = 'public.card_perks'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%perk_type%'
            LIMIT 1;

            IF constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE public.card_perks DROP CONSTRAINT %I', constraint_name);
                RAISE NOTICE 'Dropped constraint: %', constraint_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No perk_type constraint found to drop';
        END;
    END;
END $$;

-- 3. Create a comprehensive check constraint that includes all the perk types we need
ALTER TABLE public.card_perks
ADD CONSTRAINT card_perks_perk_type_check
CHECK (perk_type IN (
    -- Dental services
    'consultation',
    'cleaning',
    'extraction',
    'fluoride',
    'whitening',
    'xray',
    'denture',
    'braces',
    'filling',
    'root_canal',
    'crown',
    'bridge',
    'implant',
    'orthodontics',
    'periodontal',
    'oral_surgery',
    'emergency',

    -- General medical
    'medical_consultation',
    'health_checkup',
    'vaccination',
    'laboratory',
    'medicine_discount',

    -- Vision care
    'eye_checkup',
    'glasses_discount',
    'contact_lens',

    -- Wellness
    'wellness_package',
    'nutrition_counseling',
    'health_screening',

    -- Custom/flexible types
    'custom',
    'special',
    'premium',
    'basic',
    'standard',
    'discount',
    'voucher',
    'credit',
    'cashback',
    'freebie'
));

-- 4. Ensure default_perk_templates uses only allowed perk types
UPDATE public.default_perk_templates
SET perk_type = CASE
    WHEN perk_type NOT IN (
        'consultation', 'cleaning', 'extraction', 'fluoride', 'whitening',
        'xray', 'denture', 'braces', 'filling', 'root_canal', 'crown',
        'bridge', 'implant', 'orthodontics', 'periodontal', 'oral_surgery',
        'emergency', 'medical_consultation', 'health_checkup', 'vaccination',
        'laboratory', 'medicine_discount', 'eye_checkup', 'glasses_discount',
        'contact_lens', 'wellness_package', 'nutrition_counseling',
        'health_screening', 'custom', 'special', 'premium', 'basic',
        'standard', 'discount', 'voucher', 'credit', 'cashback', 'freebie'
    ) THEN 'custom'
    ELSE perk_type
END
WHERE perk_type NOT IN (
    'consultation', 'cleaning', 'extraction', 'fluoride', 'whitening',
    'xray', 'denture', 'braces', 'filling', 'root_canal', 'crown',
    'bridge', 'implant', 'orthodontics', 'periodontal', 'oral_surgery',
    'emergency', 'medical_consultation', 'health_checkup', 'vaccination',
    'laboratory', 'medicine_discount', 'eye_checkup', 'glasses_discount',
    'contact_lens', 'wellness_package', 'nutrition_counseling',
    'health_screening', 'custom', 'special', 'premium', 'basic',
    'standard', 'discount', 'voucher', 'credit', 'cashback', 'freebie'
);

-- 5. Clean up any existing card_perks with invalid perk types
UPDATE public.card_perks
SET perk_type = 'custom'
WHERE perk_type NOT IN (
    'consultation', 'cleaning', 'extraction', 'fluoride', 'whitening',
    'xray', 'denture', 'braces', 'filling', 'root_canal', 'crown',
    'bridge', 'implant', 'orthodontics', 'periodontal', 'oral_surgery',
    'emergency', 'medical_consultation', 'health_checkup', 'vaccination',
    'laboratory', 'medicine_discount', 'eye_checkup', 'glasses_discount',
    'contact_lens', 'wellness_package', 'nutrition_counseling',
    'health_screening', 'custom', 'special', 'premium', 'basic',
    'standard', 'discount', 'voucher', 'credit', 'cashback', 'freebie'
);

-- 6. Ensure is_claimed column exists and has proper default
ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false;

-- Update old 'claimed' column data if it exists
DO $$
BEGIN
    -- Check if the old 'claimed' column exists and copy data
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'card_perks' AND column_name = 'claimed') THEN
        UPDATE public.card_perks SET is_claimed = claimed WHERE claimed IS NOT NULL;
        -- Optionally drop the old column (uncomment if you want to clean up)
        -- ALTER TABLE public.card_perks DROP COLUMN claimed;
    END IF;
END $$;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_perks_perk_type ON public.card_perks(perk_type);
CREATE INDEX IF NOT EXISTS idx_card_perks_is_claimed ON public.card_perks(is_claimed);

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check the new constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.card_perks'::regclass AND contype = 'c';

-- Check default perk templates have valid types
SELECT perk_name, perk_type, perk_value, is_default
FROM public.default_perk_templates
WHERE is_active = true AND is_default = true
ORDER BY perk_type;

-- Test card activation by showing a sample of how perk assignment should work
-- SELECT 'Sample: Default perks that will be assigned during card activation:' AS info;
-- SELECT perk_type, perk_name, perk_value
-- FROM public.default_perk_templates
-- WHERE is_default = true AND is_active = true;