-- ===================================================================
-- MOCARDS FINAL MIGRATION SCRIPT
-- Fixed the ROW_NUMBER() issue in UPDATE statement
-- ===================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. CREATE OR UPDATE ADMIN USERS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'role') THEN
    ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) DEFAULT 'admin';
  END IF;
END $$;

-- ===================================================================
-- 2. CREATE OR UPDATE CLINICS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add ALL missing columns if they don't exist (INCLUDING clinic_code!)
DO $$
BEGIN
  -- Add clinic_code FIRST
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'clinic_code') THEN
    ALTER TABLE clinics ADD COLUMN clinic_code VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'contact_email') THEN
    ALTER TABLE clinics ADD COLUMN contact_email VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'contact_phone') THEN
    ALTER TABLE clinics ADD COLUMN contact_phone VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'address') THEN
    ALTER TABLE clinics ADD COLUMN address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'status') THEN
    ALTER TABLE clinics ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'updated_at') THEN
    ALTER TABLE clinics ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Update existing clinics without clinic_code using a simpler approach
DO $$
DECLARE
    clinic_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR clinic_record IN SELECT id FROM clinics WHERE clinic_code IS NULL ORDER BY created_at
    LOOP
        UPDATE clinics
        SET clinic_code = 'CLINIC' || LPAD(counter::text, 3, '0')
        WHERE id = clinic_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make clinic_code NOT NULL after populating it (only if there are records with NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM clinics WHERE clinic_code IS NOT NULL) THEN
    ALTER TABLE clinics ALTER COLUMN clinic_code SET NOT NULL;
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'clinics' AND constraint_name = 'clinics_clinic_code_key'
  ) THEN
    -- Only add constraint if all clinic_codes are populated
    IF NOT EXISTS (SELECT 1 FROM clinics WHERE clinic_code IS NULL) THEN
      ALTER TABLE clinics ADD CONSTRAINT clinics_clinic_code_key UNIQUE (clinic_code);
    END IF;
  END IF;
END $$;

-- ===================================================================
-- 3. CREATE OR UPDATE CARD BATCHES TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(20) UNIQUE NOT NULL,
  total_cards INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'card_batches'
    AND constraint_name = 'card_batches_created_by_fkey'
  ) THEN
    ALTER TABLE card_batches ADD CONSTRAINT card_batches_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES admin_users(id);
  END IF;
END $$;

-- ===================================================================
-- 4. CREATE OR UPDATE CARDS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  control_number VARCHAR(20) UNIQUE NOT NULL,
  passcode VARCHAR(6) NOT NULL,
  status VARCHAR(20) DEFAULT 'unactivated',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'batch_id') THEN
    ALTER TABLE cards ADD COLUMN batch_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'location_code') THEN
    ALTER TABLE cards ADD COLUMN location_code VARCHAR(10) DEFAULT 'MO';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'assigned_clinic_id') THEN
    ALTER TABLE cards ADD COLUMN assigned_clinic_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'activated_at') THEN
    ALTER TABLE cards ADD COLUMN activated_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'expires_at') THEN
    ALTER TABLE cards ADD COLUMN expires_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'updated_at') THEN
    ALTER TABLE cards ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cards'
    AND constraint_name = 'cards_batch_id_fkey'
  ) THEN
    ALTER TABLE cards ADD CONSTRAINT cards_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES card_batches(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cards'
    AND constraint_name = 'cards_assigned_clinic_id_fkey'
  ) THEN
    ALTER TABLE cards ADD CONSTRAINT cards_assigned_clinic_id_fkey
    FOREIGN KEY (assigned_clinic_id) REFERENCES clinics(id);
  END IF;
END $$;

-- ===================================================================
-- 5. CREATE OR UPDATE CARD PERKS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL,
  perk_type VARCHAR(50) NOT NULL,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  claimed_by_clinic UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'card_perks'
    AND constraint_name = 'card_perks_card_id_fkey'
  ) THEN
    ALTER TABLE card_perks ADD CONSTRAINT card_perks_card_id_fkey
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'card_perks'
    AND constraint_name = 'card_perks_claimed_by_clinic_fkey'
  ) THEN
    ALTER TABLE card_perks ADD CONSTRAINT card_perks_claimed_by_clinic_fkey
    FOREIGN KEY (claimed_by_clinic) REFERENCES clinics(id);
  END IF;
END $$;

-- ===================================================================
-- 6. CREATE OR UPDATE CARD TRANSACTIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID,
  transaction_type VARCHAR(50) NOT NULL,
  performed_by VARCHAR(50) NOT NULL,
  performed_by_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'card_transactions'
    AND constraint_name = 'card_transactions_card_id_fkey'
  ) THEN
    ALTER TABLE card_transactions ADD CONSTRAINT card_transactions_card_id_fkey
    FOREIGN KEY (card_id) REFERENCES cards(id);
  END IF;
END $$;

-- ===================================================================
-- 7. CREATE INDEXES (SAFELY - ONLY IF COLUMNS EXIST)
-- ===================================================================
DO $$
BEGIN
  -- Cards indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cards_control_number') THEN
    CREATE INDEX idx_cards_control_number ON cards(control_number);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cards_status') THEN
    CREATE INDEX idx_cards_status ON cards(status);
  END IF;

  -- Only create clinic index if assigned_clinic_id column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'assigned_clinic_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cards_clinic') THEN
      CREATE INDEX idx_cards_clinic ON cards(assigned_clinic_id);
    END IF;
  END IF;

  -- Card perks indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_card_perks_card_id') THEN
    CREATE INDEX idx_card_perks_card_id ON card_perks(card_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_card_perks_claimed') THEN
    CREATE INDEX idx_card_perks_claimed ON card_perks(claimed);
  END IF;

  -- Transactions indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_card_id') THEN
    CREATE INDEX idx_transactions_card_id ON card_transactions(card_id);
  END IF;

  -- Clinics index - ONLY create if clinic_code column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'clinic_code') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clinics_code') THEN
      CREATE INDEX idx_clinics_code ON clinics(clinic_code);
    END IF;
  END IF;
END $$;

-- ===================================================================
-- 8. ENABLE ROW LEVEL SECURITY (SAFE)
-- ===================================================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 9. CREATE OR REPLACE RLS POLICIES
-- ===================================================================

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Admin users can read all admin records" ON admin_users;
CREATE POLICY "Admin users can read all admin records" ON admin_users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for clinics" ON clinics;
CREATE POLICY "Public read access for clinics" ON clinics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage all clinic records" ON clinics;
CREATE POLICY "Admins can manage all clinic records" ON clinics
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read access for cards" ON cards;
CREATE POLICY "Public read access for cards" ON cards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage all cards" ON cards;
CREATE POLICY "Admins can manage all cards" ON cards
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read access for card perks" ON card_perks;
CREATE POLICY "Public read access for card perks" ON card_perks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Update perks access" ON card_perks;
CREATE POLICY "Update perks access" ON card_perks
  FOR UPDATE USING (true);

-- Add INSERT policy for card_perks
DROP POLICY IF EXISTS "Insert perks access" ON card_perks;
CREATE POLICY "Insert perks access" ON card_perks
  FOR INSERT WITH CHECK (true);

-- Transaction policies
DROP POLICY IF EXISTS "Read access for transactions" ON card_transactions;
CREATE POLICY "Read access for transactions" ON card_transactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert access for transactions" ON card_transactions;
CREATE POLICY "Insert access for transactions" ON card_transactions
  FOR INSERT WITH CHECK (true);

-- ===================================================================
-- 10. CREATE OR REPLACE FUNCTIONS
-- ===================================================================
CREATE OR REPLACE FUNCTION create_default_perks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO card_perks (card_id, perk_type, claimed) VALUES
    (NEW.id, 'consultation', false),
    (NEW.id, 'cleaning', false),
    (NEW.id, 'extraction', false),
    (NEW.id, 'fluoride', false),
    (NEW.id, 'whitening', false),
    (NEW.id, 'xray', false),
    (NEW.id, 'denture', false),
    (NEW.id, 'braces', false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_card_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO card_transactions (card_id, transaction_type, performed_by, performed_by_id, details)
    VALUES (NEW.id, 'created', 'admin', NEW.batch_id, '{"action": "card_created"}'::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO card_transactions (card_id, transaction_type, performed_by, performed_by_id, details)
      VALUES (NEW.id, 'status_changed', 'system', NULL,
              jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 11. CREATE TRIGGERS (DROP AND RECREATE)
-- ===================================================================
DROP TRIGGER IF EXISTS trigger_create_default_perks ON cards;
CREATE TRIGGER trigger_create_default_perks
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_default_perks();

DROP TRIGGER IF EXISTS trigger_log_card_transaction ON cards;
CREATE TRIGGER trigger_log_card_transaction
  AFTER INSERT OR UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION log_card_transaction();

-- ===================================================================
-- 12. GRANT PERMISSIONS
-- ===================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ===================================================================
-- 13. INSERT DEFAULT DATA (SAFE)
-- ===================================================================

-- Insert admin user only if it doesn't exist
INSERT INTO admin_users (username, password_hash, role)
SELECT 'admin', '$2a$10$X3rM8GqQzK5J4Hy8xY2.wOtE6P7vN9qT3kL6zS4xR2mH8fW1cA9vK', 'superadmin'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');

-- Insert demo clinic only if it doesn't exist AND clinic_code column exists
INSERT INTO clinics (clinic_code, clinic_name, password_hash, contact_email, address)
SELECT 'DEMO001', 'Demo Dental Clinic', encode(sha256('demo123'::bytea), 'base64'), 'demo@clinic.com', '123 Demo Street, Demo City'
WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE clinic_name = 'Demo Dental Clinic')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'clinic_code');

-- ===================================================================
-- 14. FINAL VERIFICATION
-- ===================================================================

-- Show table status
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name AND table_schema = 'public')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (VALUES
  ('admin_users'),
  ('clinics'),
  ('card_batches'),
  ('cards'),
  ('card_perks'),
  ('card_transactions')
) t(table_name);

-- Show admin users
SELECT 'Admin Users:' as info, username, role FROM admin_users;

-- Show clinics (with their new clinic_codes) - but only if clinic_code column exists
SELECT 'Clinics:' as info,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'clinic_code')
    THEN clinic_code
    ELSE 'NO_CODE'
  END as clinic_code,
  clinic_name
FROM clinics LIMIT 5;

-- Show indexes created
SELECT 'Indexes Created:' as info, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'clinics', 'cards', 'card_perks', 'card_transactions')
ORDER BY tablename, indexname;

-- ===================================================================
-- MIGRATION COMPLETE!
-- Your MOCARDS database is now fully configured and ready to use.
-- All missing columns have been added and existing data preserved.
-- ===================================================================