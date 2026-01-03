-- MOCARDS CLOUD - CLEANUP FIRST (Run this before main schema)
-- This script safely handles existing objects that might conflict

-- ============================================================================
-- SAFE CLEANUP OF EXISTING OBJECTS
-- ============================================================================

-- Handle view/table conflicts
DO $$
BEGIN
    -- Drop as view first, then as table if it exists
    BEGIN
        DROP VIEW IF EXISTS clinic_codes_by_region CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if it doesn't exist as view
    END;

    BEGIN
        DROP TABLE IF EXISTS clinic_codes_by_region CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if it doesn't exist as table
    END;

    -- Repeat for other potential conflicts
    BEGIN
        DROP VIEW IF EXISTS active_regions CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP TABLE IF EXISTS active_regions CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP VIEW IF EXISTS active_clinic_codes CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP TABLE IF EXISTS active_clinic_codes CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP VIEW IF EXISTS available_clinic_codes CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP TABLE IF EXISTS available_clinic_codes CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP VIEW IF EXISTS cards_with_clinics CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        DROP TABLE IF EXISTS cards_with_clinics CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

END $$;

-- ============================================================================
-- COMPREHENSIVE TABLE CLEANUP
-- ============================================================================

-- Drop all legacy and complex tables
DROP TABLE IF EXISTS perk_redemptions CASCADE;
DROP TABLE IF EXISTS perk_usage_analytics CASCADE;
DROP TABLE IF EXISTS clinic_perk_customizations CASCADE;
DROP TABLE IF EXISTS perk_categories CASCADE;
DROP TABLE IF EXISTS appointment_notifications CASCADE;
DROP TABLE IF EXISTS appointment_status_history CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS card_transactions CASCADE;
DROP TABLE IF EXISTS card_code_history CASCADE;
DROP TABLE IF EXISTS card_perks CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS card_batches CASCADE;
DROP TABLE IF EXISTS user_session_state CASCADE;
DROP TABLE IF EXISTS system_versions CASCADE;
DROP TABLE IF EXISTS code_generation_settings CASCADE;
DROP TABLE IF EXISTS location_codes CASCADE;
DROP TABLE IF EXISTS clinic_codes CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS default_perk_datalates CASCADE;
DROP TABLE IF EXISTS perk_datalates CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS mocards_admin_users CASCADE;

-- Drop analytics and enterprise tables
DROP TABLE IF EXISTS analytics_data CASCADE;
DROP TABLE IF EXISTS enterprise_data CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS business_intelligence CASCADE;
DROP TABLE IF EXISTS complex_reports CASCADE;

-- ============================================================================
-- FUNCTION CLEANUP - Handle Overloaded Functions
-- ============================================================================

-- Drop functions with specific signatures to avoid "not unique" errors
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions by iterating through them
    FOR func_record IN
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc
        WHERE proname IN (
            'search_card_universal',
            'generate_batch_number',
            'generate_control_number',
            'generate_passcode',
            'normalize_code',
            'update_appointment_status',
            'reschedule_appointment',
            'get_card_by_identifier'
        )
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %I(%s) CASCADE', func_record.proname, func_record.args);
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore errors
        END;
    END LOOP;
END $$;

-- ============================================================================
-- TYPE CLEANUP
-- ============================================================================

DROP TYPE IF EXISTS clinic_plan CASCADE;
DROP TYPE IF EXISTS card_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS perk_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- Cleanup completed - ready for fresh schema
SELECT 'Cleanup completed successfully' as result;