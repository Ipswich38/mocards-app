-- Check current table structure
SELECT 'CLINICS TABLE COLUMNS:' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'clinics'
ORDER BY ordinal_position;

SELECT 'EXISTING CLINICS DATA:' as info;
SELECT * FROM clinics LIMIT 3;