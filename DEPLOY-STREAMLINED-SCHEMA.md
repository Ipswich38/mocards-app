# 🚀 DEPLOY STREAMLINED SCHEMA - Step by Step

## ⚠️ HANDLING DEPLOYMENT CONFLICTS

If you encounter errors like:
- `"clinic_codes_by_region" is not a view`
- `function name "generate_control_number" is not unique`

This confirms the existing schema chaos! Choose the appropriate cleanup method:

## 🔧 CLEANUP OPTIONS (Choose One)

### Option 1: Simple Cleanup (Recommended)
```sql
-- Execute in Supabase SQL Editor:
-- File: supabase/schema-simple-cleanup.sql
```
**Best for:** Most conflict scenarios, handles function overloads safely

### Option 2: Advanced Cleanup
```sql
-- Execute in Supabase SQL Editor:
-- File: supabase/schema-cleanup-first.sql
```
**Best for:** When you want more control over the cleanup process

### Option 3: Nuclear Option (If others fail)
```sql
-- Execute in Supabase SQL Editor:
-- File: supabase/schema-nuclear-cleanup.sql
```
**Best for:** Complete fresh start, eliminates ALL possible conflicts

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