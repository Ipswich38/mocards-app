# 🚀 DEPLOY STREAMLINED SCHEMA - Step by Step

## ⚠️ IMPORTANT: Handle the Table/View Conflict Error

If you get this error:
```
Error: Failed to run sql query: ERROR: 42809: "clinic_codes_by_region" is not a view
```

This means there's a naming conflict between existing tables and views. Follow these steps:

## 🔧 Step 1: Clean Up Existing Objects

Run this first to safely remove all conflicting objects:

```sql
-- Execute in Supabase SQL Editor:
-- File: supabase/schema-cleanup-first.sql
```

**OR manually run:**

```sql
-- Handle table/view conflicts manually
DROP TABLE IF EXISTS clinic_codes_by_region CASCADE;
DROP TABLE IF EXISTS active_regions CASCADE;
DROP TABLE IF EXISTS active_clinic_codes CASCADE;
DROP VIEW IF EXISTS clinic_codes_by_region CASCADE;
DROP VIEW IF EXISTS active_regions CASCADE;
DROP VIEW IF EXISTS active_clinic_codes CASCADE;
```

## 🚀 Step 2: Deploy Fresh Schema

After cleanup, run the main schema:

```sql
-- Execute in Supabase SQL Editor:
-- File: supabase/schema-streamlined-fresh.sql
```

## ✅ Step 3: Verify Deployment

Check that these tables were created:

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Should show:
-- appointments
-- card_perks
-- cards
-- clinic_codes
-- clinics
-- perk_redemptions
-- regions
```

## 🧪 Step 4: Test Schema

```sql
-- Test regions
SELECT count(*) as region_count FROM regions;
-- Should return: 17

-- Test clinic codes
SELECT count(*) as code_count FROM clinic_codes;
-- Should return: 66

-- Test a sample query
SELECT * FROM available_clinic_codes LIMIT 5;
```

## 🎯 Alternative: Manual Deployment

If you continue getting conflicts, deploy manually in this order:

### 1. Clean Everything
```sql
-- Drop all existing objects
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
```

### 2. Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3. Create Types
```sql
CREATE TYPE card_status AS ENUM ('active', 'inactive');
CREATE TYPE appointment_status AS ENUM ('pending', 'accepted', 'declined', 'completed');
CREATE TYPE clinic_plan AS ENUM ('starter', 'growth', 'pro');
```

### 4. Create Tables One by One
```sql
-- 1. Regions
CREATE TABLE regions (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 2. Clinic codes
CREATE TABLE clinic_codes (
    code VARCHAR(20) PRIMARY KEY,
    region_code VARCHAR(10) NOT NULL REFERENCES regions(code),
    description VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Continue with remaining tables...
```

## 🚨 If Something Goes Wrong

### Rollback Plan:
```sql
-- Restore from backup (if you have one)
-- OR start over with manual deployment above
```

### Get Help:
1. Check Supabase logs for detailed error messages
2. Try the manual deployment approach
3. Verify no other sessions are using the database

## 🎉 Success Indicators

When successful, you should have:
- ✅ 7 simple tables (no complex analytics)
- ✅ 17 regions including 4B MIMAROPA
- ✅ 66 clinic codes (CVT/BTG/LGN/MIM 001-016)
- ✅ Clean, conflict-free schema
- ✅ All views working properly

The new schema eliminates all chaos and provides exactly what the client needs!