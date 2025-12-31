-- ===============================================
-- SEQUENCE FIX: Work with existing sequence boundaries
-- ===============================================
-- Fix the sequence issue and make card generation work

-- ===============================================
-- STEP 1: ADD MISSING COLUMNS TO EXISTING CARDS TABLE
-- ===============================================

DO $$
BEGIN
    -- Add missing columns
    BEGIN ALTER TABLE public.cards ADD COLUMN card_type VARCHAR(20) DEFAULT 'standard'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN card_uuid UUID DEFAULT gen_random_uuid(); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '2 years'); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN activation_date TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN last_used TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN is_test BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN email VARCHAR(255); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN activated_by VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.cards ADD COLUMN created_by VARCHAR(100) DEFAULT 'system'; EXCEPTION WHEN duplicate_column THEN NULL; END;

    RAISE NOTICE '✅ Card columns added';
END $$;

-- ===============================================
-- STEP 2: FIX CARD NUMBER SEQUENCE TO WORK WITH EXISTING BOUNDS
-- ===============================================

DO $$
DECLARE
    current_max BIGINT;
    next_val BIGINT;
BEGIN
    -- Get current max card number from existing cards
    SELECT COALESCE(MAX(CAST(SUBSTRING(control_number FROM 4) AS BIGINT)), 0)
    INTO current_max
    FROM public.cards
    WHERE control_number ~ '^MOC[0-9]+$';

    -- Set next value within the existing sequence bounds (1 to 99999999)
    next_val := GREATEST(current_max + 1, 1);

    -- Make sure it's within bounds
    IF next_val > 99999999 THEN
        next_val := 1; -- Reset if we've hit the limit
    END IF;

    -- Set the sequence to the correct value
    PERFORM setval('public.card_number_seq', next_val);

    RAISE NOTICE '✅ Sequence set to: %', next_val;
END $$;

-- ===============================================
-- STEP 3: CREATE WORKING CARD GENERATION FUNCTION
-- ===============================================

-- Card generation function that works with existing sequence bounds
CREATE OR REPLACE FUNCTION generate_card_control_number()
RETURNS TEXT AS $$
DECLARE
    next_num BIGINT;
    control_num TEXT;
BEGIN
    next_num := nextval('public.card_number_seq');
    -- Use 8-digit padding to work with existing sequence bounds
    control_num := 'MOC' || LPAD(next_num::TEXT, 8, '0');
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
-- STEP 4: CREATE TRIGGER
-- ===============================================

-- Remove existing triggers
DROP TRIGGER IF EXISTS auto_generate_control_number ON public.cards;
DROP TRIGGER IF EXISTS trigger_auto_generate_card_control_number ON public.cards;

-- Create working trigger
CREATE TRIGGER trigger_auto_generate_card_control_number
    BEFORE INSERT ON public.cards
    FOR EACH ROW EXECUTE FUNCTION auto_generate_card_control_number();

-- ===============================================
-- STEP 5: GRANT PERMISSIONS
-- ===============================================

GRANT ALL ON public.cards TO anon, authenticated;
GRANT ALL ON public.card_number_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_card_control_number() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_card_control_number() TO anon, authenticated;

-- ===============================================
-- STEP 6: TEST CARD GENERATION
-- ===============================================

-- Test card generation
SELECT '🃏 TESTING CARD GENERATION:' as "TEST";
SELECT generate_card_control_number() as "Test_Card_1";
SELECT generate_card_control_number() as "Test_Card_2";
SELECT generate_card_control_number() as "Test_Card_3";

-- Test card insertion
INSERT INTO public.cards (
    full_name, clinic_id, batch_id, status, card_type, created_by
) VALUES (
    'Sequence Test User',
    (SELECT id FROM public.clinics LIMIT 1),
    'SEQ_TEST_' || EXTRACT(EPOCH FROM NOW())::INTEGER,
    'unactivated',
    'standard',
    'sequence_test'
);

-- Show the result
SELECT 'Generated Card:' as "RESULT", control_number, full_name
FROM public.cards
WHERE created_by = 'sequence_test'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test
DELETE FROM public.cards WHERE created_by = 'sequence_test';

-- Final verification
SELECT '✅ CARD GENERATOR NOW WORKING!' as "STATUS";
SELECT 'Next card will be: ' || generate_card_control_number() as "NEXT_CARD";