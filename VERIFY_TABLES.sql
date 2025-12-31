-- Verify what tables exist after schema deployment
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname IN ('public', 'app_cards', 'app_clinics', 'app_analytics')
ORDER BY schemaname, tablename;