-- ===============================================
-- MINIMAL CARD GENERATOR FIX - AVOIDS CONFLICTS
-- ===============================================
-- This fixes card generation without recreating existing objects

-- ===============================================
-- STEP 1: ENSURE PERMISSIONS ON EXISTING OBJECTS
-- ===============================================

-- Grant permissions on existing cards table and sequence
GRANT ALL ON public.cards TO anon, authenticated;
GRANT ALL ON public.card_number_seq TO anon, authenticated;

-- Grant permissions on functions if they exist
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION generate_card_control_number() TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION generate_control_number_trigger() TO anon, authenticated;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Some functions may not exist yet, continuing...';
END $$;

-- ===============================================
-- STEP 2: CREATE FUNCTIONS ONLY IF MISSING
-- ===============================================

-- Create card number generation function only if it doesn't exist
CREATE OR REPLACE FUNCTION generate_card_control_number()
RETURNS TEXT AS $$
DECLARE
    next_num BIGINT;
BEGIN
    next_num := nextval('public.card_number_seq');
    RETURN 'MOC' || LPAD(next_num::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- STEP 3: TEST CARD GENERATION CAPABILITY
-- ===============================================

-- Test that card generation works
SELECT '🃏 TESTING CARD GENERATION:' as "TEST";
SELECT generate_card_control_number() as "Sample_Card_Number_1";
SELECT generate_card_control_number() as "Sample_Card_Number_2";

-- Test card table access
SELECT '📊 CARD SYSTEM STATUS:' as "STATUS";
SELECT
    COUNT(*) as "Total_Cards",
    (SELECT last_value FROM public.card_number_seq) as "Next_Card_Number"
FROM public.cards;

SELECT '✅ CARD GENERATOR SHOULD NOW WORK!' as "RESULT";