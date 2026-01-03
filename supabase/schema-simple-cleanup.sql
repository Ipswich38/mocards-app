-- MOCARDS CLOUD - SIMPLE CLEANUP (Reliable approach)
-- Handles function conflicts by dropping all functions in public schema

-- ============================================================================
-- SIMPLE BUT EFFECTIVE CLEANUP
-- ============================================================================

-- Drop all views first (ignore errors)
DROP VIEW IF EXISTS clinic_codes_by_region CASCADE;
DROP VIEW IF EXISTS active_regions CASCADE;
DROP VIEW IF EXISTS active_clinic_codes CASCADE;
DROP VIEW IF EXISTS available_clinic_codes CASCADE;
DROP VIEW IF EXISTS cards_with_clinics CASCADE;

-- Drop all tables (ignore errors)
DROP TABLE IF EXISTS clinic_codes_by_region CASCADE;
DROP TABLE IF EXISTS active_regions CASCADE;
DROP TABLE IF EXISTS active_clinic_codes CASCADE;
DROP TABLE IF EXISTS available_clinic_codes CASCADE;
DROP TABLE IF EXISTS cards_with_clinics CASCADE;
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
DROP TABLE IF EXISTS analytics_data CASCADE;
DROP TABLE IF EXISTS enterprise_data CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS business_intelligence CASCADE;
DROP TABLE IF EXISTS complex_reports CASCADE;

-- ============================================================================
-- DROP ALL FUNCTIONS IN PUBLIC SCHEMA (Simple approach)
-- ============================================================================

DO $$
DECLARE
    func_name text;
BEGIN
    FOR func_name IN
        SELECT 'DROP FUNCTION IF EXISTS ' || oid::regprocedure || ' CASCADE;'
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
    LOOP
        BEGIN
            EXECUTE func_name;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors, just continue
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- DROP ALL TYPES
-- ============================================================================

DROP TYPE IF EXISTS clinic_plan CASCADE;
DROP TYPE IF EXISTS card_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS perk_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- Success message
SELECT 'Simple cleanup completed successfully - ready for fresh schema' as result;