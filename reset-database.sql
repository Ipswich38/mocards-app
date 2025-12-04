-- ===================================================================
-- MOCARDS DATABASE RESET SCRIPT
-- WARNING: This will DELETE ALL data in MOCARDS tables!
-- Only use this if you want to start completely fresh
-- ===================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_create_default_perks ON cards;
DROP TRIGGER IF EXISTS trigger_log_card_transaction ON cards;

-- Drop functions
DROP FUNCTION IF EXISTS create_default_perks();
DROP FUNCTION IF EXISTS log_card_transaction();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS card_transactions CASCADE;
DROP TABLE IF EXISTS card_perks CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS card_batches CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Confirm cleanup
SELECT 'Reset Complete - All MOCARDS tables dropped' as status;

-- ===================================================================
-- After running this, you can safely run quick-setup.sql
-- ===================================================================