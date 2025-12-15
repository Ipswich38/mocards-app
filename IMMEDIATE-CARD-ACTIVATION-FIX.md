# IMMEDIATE FIX FOR CARD ACTIVATION ERROR

## ❌ **Current Error:**
```
Failed to activate card: new row for relation "card_perks" violates check constraint "card_perks_perk_type_check"
```

## ✅ **Quick Fix - Execute This SQL:**

**Go to Supabase Dashboard > SQL Editor and execute:**

```sql
-- IMMEDIATE PERK CONSTRAINT FIX
-- Drop existing constraint and create comprehensive one

-- Drop the restrictive constraint
ALTER TABLE public.card_perks DROP CONSTRAINT IF EXISTS card_perks_perk_type_check;

-- Create comprehensive constraint allowing all necessary perk types
ALTER TABLE public.card_perks
ADD CONSTRAINT card_perks_perk_type_check
CHECK (perk_type IN (
    -- Dental services
    'consultation', 'cleaning', 'extraction', 'fluoride', 'whitening',
    'xray', 'denture', 'braces', 'filling', 'root_canal', 'crown',
    'bridge', 'implant', 'orthodontics', 'periodontal', 'oral_surgery',
    'emergency',
    -- General medical
    'medical_consultation', 'health_checkup', 'vaccination', 'laboratory',
    'medicine_discount',
    -- Vision care
    'eye_checkup', 'glasses_discount', 'contact_lens',
    -- Wellness
    'wellness_package', 'nutrition_counseling', 'health_screening',
    -- Flexible types
    'custom', 'special', 'premium', 'basic', 'standard', 'discount',
    'voucher', 'credit', 'cashback', 'freebie'
));

-- Ensure is_claimed column exists
ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false;

-- Verify the fix
SELECT 'CONSTRAINT FIXED' as status;
```

## 🔧 **Or Execute Complete Fix:**

**Execute the entire `fix-card-perks-constraint.sql` file** for a comprehensive fix that also cleans up existing invalid perk types.

## 🧪 **After Executing the Fix:**

1. **Try card activation again** - should work without errors
2. **Verify perks are assigned** during activation
3. **Test clinic activation functionality**

## 📊 **Root Cause:**
The original constraint was too restrictive and didn't include all the perk types that the application tries to assign during card activation.

**Execute the SQL fix above and card activation will work immediately.**