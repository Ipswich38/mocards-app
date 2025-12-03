# ✅ MOCARDS Deployment Checklist

## 🎯 Quick Start (5 Minutes)

### Step 1: Database Setup
1. **Open Supabase Dashboard**: Go to your project at `https://lxyexybnotixgpzflota.supabase.co`
2. **Navigate to SQL Editor**: Click "SQL Editor" in the left sidebar
3. **Execute Setup Script**:
   - Copy the entire contents of `quick-setup.sql`
   - Paste into SQL Editor
   - Click "RUN" button
   - ✅ Should see "Success. No rows returned" message

### Step 2: Environment Variables
1. **Check .env file exists** with:
```env
VITE_SUPABASE_URL=https://lxyexybnotixgpzflota.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM
```

### Step 3: Launch Application
```bash
npm install
npm run dev
```

---

## 🧪 Immediate Testing Protocol

### Test 1: Admin Login ✅
- **URL**: http://localhost:5173
- **Action**: Click "Admin Login" (top-right)
- **Credentials**: `admin` / `admin123`
- **Expected**: Access to Super Admin Dashboard

### Test 2: Card Generation ✅
- **Navigation**: Admin Dashboard → "Card Generation" tab
- **Action**: Generate 5 test cards
- **Expected**:
  - Batch created with unique number (e.g., MO-B123456AB)
  - 5 cards with control numbers (e.g., MO-C123456AB-001)
  - CSV download available
  - Cards visible in preview

### Test 3: Clinic Creation ✅
- **Navigation**: Admin Dashboard → "Clinics" tab
- **Action**: Create test clinic
- **Data**:
  - Clinic Name: "Test Clinic"
  - Password: "test123"
  - Email: "test@clinic.com"
- **Expected**: Clinic appears in list with auto-generated code

### Test 4: Clinic Login ✅
- **Action**: Return to landing page
- **Navigation**: Click "Clinic Portal" tab
- **Credentials**: Use clinic code/password from Test 3
- **Expected**: Access to Clinic Dashboard

### Test 5: Card Activation ✅
- **Navigation**: Clinic Dashboard → "Card Management"
- **Action**: Search for card control number from Test 2
- **Expected**:
  - Card found with "unactivated" status
  - "Activate Card" button visible
  - After activation: card status changes to "activated"

### Test 6: Perk Redemption ✅
- **Prerequisite**: Activated card from Test 5
- **Action**: Search same card again
- **Expected**:
  - 8 perks visible (consultation, cleaning, etc.)
  - Click individual perks to redeem
  - Redeemed perks show in "Redemptions" tab

### Test 7: Patient View ✅
- **Action**: Return to landing page
- **Navigation**: "Patient Access" tab
- **Credentials**: Control number + passcode from Test 2
- **Expected**:
  - Card displays with all details
  - Perk statuses show correctly (claimed vs available)
  - Card status shows "activated"

---

## 🔍 Database Verification Queries

Run these in Supabase SQL Editor to verify setup:

### Check Table Structure
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Verify Triggers and Functions
```sql
-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public';

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Test Data Validation
```sql
-- Check admin user
SELECT username, role FROM admin_users;

-- Check demo clinic
SELECT clinic_code, clinic_name FROM clinics;

-- Check if any cards exist (after generation test)
SELECT COUNT(*) as total_cards FROM cards;

-- Check perks auto-generation
SELECT c.control_number, COUNT(p.id) as perk_count
FROM cards c
LEFT JOIN card_perks p ON c.id = p.card_id
GROUP BY c.control_number;
```

---

## 🚨 Troubleshooting Guide

### Issue: "Failed to connect to server"
**Cause**: Database not set up or wrong credentials
**Solution**:
1. Verify SQL script ran successfully
2. Check .env file has correct Supabase URL
3. Restart dev server

### Issue: "Card not found"
**Cause**: Card lookup logic mismatch
**Solution**:
1. Verify card exists: `SELECT * FROM cards WHERE control_number = 'your-number';`
2. Check exact control number format
3. Verify passcode matches

### Issue: "Admin user not found"
**Cause**: Default admin not created
**Solution**:
```sql
INSERT INTO admin_users (username, password_hash, role) VALUES
('admin', '$2a$10$X3rM8GqQzK5J4Hy8xY2.wOtE6P7vN9qT3kL6zS4xR2mH8fW1cA9vK', 'superadmin');
```

### Issue: "Permission denied" errors
**Cause**: RLS policies blocking access
**Solution**: Re-run the RLS policy creation section of setup script

### Issue: Perks not auto-created
**Cause**: Trigger not working
**Solution**:
1. Verify trigger exists: Check triggers query above
2. Re-create trigger if missing
3. Manually test: Insert a card and check perks

---

## 🎯 Success Indicators

### ✅ Database Setup Complete
- [ ] 6 tables created (admin_users, clinics, card_batches, cards, card_perks, card_transactions)
- [ ] All indexes created successfully
- [ ] RLS policies active
- [ ] Triggers and functions operational
- [ ] Default admin user exists

### ✅ Application Integration
- [ ] App connects to Supabase without errors
- [ ] Admin login works
- [ ] Card generation creates database records
- [ ] Clinic creation works
- [ ] Card activation updates status
- [ ] Perk redemption updates database
- [ ] Patient lookup returns correct data

### ✅ Data Flow Validation
- [ ] Admin generates cards → Cards appear in database
- [ ] Clinic activates card → Status updates + audit trail created
- [ ] Clinic redeems perk → Perk marked as claimed + transaction logged
- [ ] Patient views card → Sees updated status in real-time

### ✅ Audit Trail Working
- [ ] Card creation logged in transactions table
- [ ] Card activation logged with clinic details
- [ ] Perk redemptions tracked with timestamps
- [ ] All database changes have proper audit trail

---

## 🚀 Production Readiness

Your MOCARDS system is **production-ready** when:

✅ All tests pass without errors
✅ Database performance is optimal (indexes working)
✅ Real-time sync working across all dashboards
✅ Audit trail capturing all transactions
✅ Security policies properly restricting access
✅ Error handling graceful across all scenarios

**Expected Total Setup Time**: 5-10 minutes
**Expected Testing Time**: 10-15 minutes
**Total Time to Production**: 15-25 minutes

Once all checkboxes are complete, your MOCARDS system is ready for real-world deployment! 🎉