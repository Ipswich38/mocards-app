-- ===================================================================
-- MOCARDS DIAGNOSTIC SCRIPT
-- Run this first to see your current table structure
-- ===================================================================

-- Check which MOCARDS tables already exist
SELECT
  'Existing Tables:' as info,
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_users', 'clinics', 'card_batches', 'cards', 'card_perks', 'card_transactions')
ORDER BY table_name;

-- Check clinics table structure (the problematic one)
SELECT
  'CLINICS Table Structure:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'clinics'
ORDER BY ordinal_position;

-- Check cards table structure
SELECT
  'CARDS Table Structure:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cards'
ORDER BY ordinal_position;

-- Check admin_users table structure
SELECT
  'ADMIN_USERS Table Structure:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- Check existing indexes
SELECT
  'Existing Indexes:' as info,
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'clinics', 'card_batches', 'cards', 'card_perks', 'card_transactions')
ORDER BY tablename, indexname;

-- Check existing data counts
SELECT 'Data Counts:' as info,
       (SELECT COUNT(*) FROM admin_users) as admin_users,
       (SELECT COUNT(*) FROM clinics) as clinics,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cards')
            THEN (SELECT COUNT(*) FROM cards)
            ELSE 0
       END as cards;

-- ===================================================================
-- This will show exactly what you have so we can fix it properly
-- ===================================================================