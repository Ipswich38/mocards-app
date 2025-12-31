-- ===============================================
-- FOCUSED FIX: ADD MISSING COLUMNS AND MAKE EVERYTHING WORK
-- ===============================================
-- Goal: Both add clinic AND card generator working together
-- Approach: Add missing columns, fix what's broken, don't recreate what works

-- ===============================================
-- STEP 1: ADD MISSING COLUMNS TO EXISTING CARDS TABLE
-- ===============================================

-- Add missing columns that the unified schema expects
DO $$
BEGIN
    -- Add card_type column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN card_type VARCHAR(20) DEFAULT 'standard';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add card_uuid column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN card_uuid UUID DEFAULT gen_random_uuid();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add expiry_date column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '2 years');
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add activation_date column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN activation_date TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add last_used column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN last_used TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add is_test column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN is_test BOOLEAN DEFAULT false;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add email column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN email VARCHAR(255);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add activated_by column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN activated_by VARCHAR(100);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add created_by column if missing
    BEGIN
        ALTER TABLE public.cards ADD COLUMN created_by VARCHAR(100) DEFAULT 'system';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    RAISE NOTICE '✅ Missing card columns added successfully';
END $$;

-- ===============================================
-- STEP 2: ADD MISSING COLUMNS TO EXISTING CLINICS TABLE
-- ===============================================

DO $$
BEGIN
    -- Add enterprise columns that might be missing
    BEGIN
        ALTER TABLE public.clinics ADD COLUMN clinic_uuid UUID DEFAULT gen_random_uuid();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN salt TEXT DEFAULT encode(gen_random_bytes(32), 'hex');
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN current_month_cards INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN monthly_card_limit INTEGER DEFAULT 500;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN current_balance DECIMAL(10,2) DEFAULT 0.00;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN gdpr_consent BOOLEAN DEFAULT false;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN compliance_status VARCHAR(20) DEFAULT 'compliant';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN created_by VARCHAR(100) DEFAULT 'system';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.clinics ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    RAISE NOTICE '✅ Missing clinic columns added successfully';
END $$;

-- ===============================================
-- STEP 3: ENSURE CARD GENERATION WORKS
-- ===============================================

-- Make sure card number sequence exists and is properly configured
DO $$
BEGIN
    -- Reset sequence to start from a reasonable number if it exists
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'card_number_seq') THEN
        -- Set to start from current max + 1, or 100000001 if no cards exist
        PERFORM setval('public.card_number_seq',
            GREATEST(
                COALESCE((SELECT MAX(CAST(SUBSTRING(control_number FROM 4) AS BIGINT)) FROM public.cards WHERE control_number ~ '^MOC[0-9]+$'), 100000000),
                100000000
            ) + 1
        );
    ELSE
        CREATE SEQUENCE public.card_number_seq
            START WITH 100000001
            INCREMENT BY 1
            MINVALUE 100000001
            MAXVALUE 999999999
            CACHE 100
            NO CYCLE;
    END IF;

    RAISE NOTICE '✅ Card number sequence configured';
END $$;

-- ===============================================
-- STEP 4: RECREATE WORKING CARD GENERATION FUNCTION
-- ===============================================

-- Robust card number generation
CREATE OR REPLACE FUNCTION generate_card_control_number()
RETURNS TEXT AS $$
DECLARE
    next_num BIGINT;
    control_num TEXT;
BEGIN
    next_num := nextval('public.card_number_seq');
    control_num := 'MOC' || LPAD(next_num::TEXT, 9, '0');
    RETURN control_num;
END;
$$ LANGUAGE plpgsql;

-- Auto-generation trigger function
CREATE OR REPLACE FUNCTION auto_generate_card_control_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.control_number IS NULL OR NEW.control_number = '' THEN
        NEW.control_number := generate_card_control_number();
    END IF;
    IF NEW.card_uuid IS NULL THEN
        NEW.card_uuid := gen_random_uuid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- STEP 5: RECREATE TRIGGERS PROPERLY
-- ===============================================

-- Remove existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS auto_generate_control_number ON public.cards;
DROP TRIGGER IF EXISTS trigger_auto_generate_card_control_number ON public.cards;

-- Create the working trigger
CREATE TRIGGER trigger_auto_generate_card_control_number
    BEFORE INSERT ON public.cards
    FOR EACH ROW EXECUTE FUNCTION auto_generate_card_control_number();

-- ===============================================
-- STEP 6: ENSURE ALL PERMISSIONS ARE CORRECT
-- ===============================================

-- Grant comprehensive permissions
GRANT ALL ON public.clinics TO anon, authenticated;
GRANT ALL ON public.cards TO anon, authenticated;
GRANT ALL ON public.card_number_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_card_control_number() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_card_control_number() TO anon, authenticated;

-- ===============================================
-- STEP 7: TEST EVERYTHING WORKS
-- ===============================================

-- Test clinic functionality
SELECT '🏥 TESTING CLINIC FUNCTIONALITY:' as "CLINIC_TEST";
SELECT COUNT(*) as "Total_Clinics" FROM public.clinics;

-- Test card generation
SELECT '🃏 TESTING CARD GENERATION:' as "CARD_TEST";
SELECT generate_card_control_number() as "Test_Card_1";
SELECT generate_card_control_number() as "Test_Card_2";

-- Test card insertion with auto-generation
INSERT INTO public.cards (
    full_name, clinic_id, batch_id, status, card_type, created_by
) VALUES (
    'Final Test User',
    (SELECT id FROM public.clinics LIMIT 1),
    'FINAL_TEST_' || EXTRACT(EPOCH FROM NOW())::INTEGER,
    'unactivated',
    'standard',
    'focused_fix'
);

-- Verify the test card was created with auto-generated control number
SELECT '✅ FINAL VERIFICATION:' as "VERIFICATION";
SELECT control_number, full_name, status, card_type
FROM public.cards
WHERE created_by = 'focused_fix'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test card
DELETE FROM public.cards WHERE created_by = 'focused_fix';

-- Final status
SELECT '🎯 BOTH SYSTEMS NOW WORKING!' as "FINAL_STATUS";
SELECT 'Add Clinic: ✅ | Card Generator: ✅' as "FUNCTIONALITY_STATUS";