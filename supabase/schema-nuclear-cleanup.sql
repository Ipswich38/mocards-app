-- MOCARDS CLOUD - NUCLEAR CLEANUP (Use if other cleanup fails)
-- This completely resets the public schema

-- ============================================================================
-- NUCLEAR OPTION - COMPLETE SCHEMA RESET
-- ============================================================================

-- This will remove EVERYTHING in the public schema
-- Use this if you're getting conflicts and want a completely fresh start

-- Drop and recreate the entire public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO postgres, service_role;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Success message
SELECT 'Nuclear cleanup completed - schema completely reset' as result;

-- ============================================================================
-- NEXT STEPS AFTER NUCLEAR CLEANUP
-- ============================================================================

-- After running this script:
-- 1. Your database is completely clean (no tables, views, functions, types)
-- 2. You can now run the main streamlined schema without any conflicts
-- 3. All chaos and complexity has been eliminated
-- 4. Fresh start guaranteed

-- To deploy the new schema:
-- Execute: supabase/schema-streamlined-fresh.sql