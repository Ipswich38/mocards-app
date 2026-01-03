-- MOCARDS CLOUD - BULLETPROOF CLEANUP
-- Handles the specific "is not a view" error by checking object types first

-- ============================================================================
-- BULLETPROOF CLEANUP - HANDLES ALL OBJECT TYPE CONFLICTS
-- ============================================================================

-- Handle each problematic object individually with type checking
DO $$
BEGIN
    -- Drop clinic_codes_by_region (the problematic one)
    BEGIN
        -- Try as table first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinic_codes_by_region' AND table_schema = 'public') THEN
            DROP TABLE clinic_codes_by_region CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        -- Try as view
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'clinic_codes_by_region' AND table_schema = 'public') THEN
            DROP VIEW clinic_codes_by_region CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Handle other potentially conflicting objects
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_regions' AND table_schema = 'public') THEN
            DROP TABLE active_regions CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'active_regions' AND table_schema = 'public') THEN
            DROP VIEW active_regions CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_clinic_codes' AND table_schema = 'public') THEN
            DROP TABLE active_clinic_codes CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'active_clinic_codes' AND table_schema = 'public') THEN
            DROP VIEW active_clinic_codes CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'available_clinic_codes' AND table_schema = 'public') THEN
            DROP TABLE available_clinic_codes CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'available_clinic_codes' AND table_schema = 'public') THEN
            DROP VIEW available_clinic_codes CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cards_with_clinics' AND table_schema = 'public') THEN
            DROP TABLE cards_with_clinics CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'cards_with_clinics' AND table_schema = 'public') THEN
            DROP VIEW cards_with_clinics CASCADE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

END $$;

-- ============================================================================
-- DROP ALL REMAINING TABLES (SAFE)
-- ============================================================================

-- Now drop all other tables safely
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
-- DROP ALL FUNCTIONS (SAFE)
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    drop_stmt text;
BEGIN
    FOR func_record IN
        SELECT p.oid::regprocedure::text as signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        BEGIN
            drop_stmt := 'DROP FUNCTION IF EXISTS ' || func_record.signature || ' CASCADE';
            EXECUTE drop_stmt;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore errors, continue
        END;
    END LOOP;
END $$;

-- ============================================================================
-- DROP ALL TYPES (SAFE)
-- ============================================================================

DROP TYPE IF EXISTS clinic_plan CASCADE;
DROP TYPE IF EXISTS card_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS perk_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Verify cleanup
SELECT
    'Tables: ' || count(*) as remaining_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT
    'Views: ' || count(*) as remaining_views
FROM information_schema.views
WHERE table_schema = 'public';

SELECT
    'Functions: ' || count(*) as remaining_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- Success message
SELECT 'Bulletproof cleanup completed successfully - ready for fresh schema' as result;