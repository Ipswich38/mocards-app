-- ===================================================================
-- MOCARDS SAFE SIMPLE MIGRATION
-- This will work regardless of current database state
-- ===================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. SAFELY CREATE/UPDATE ADMIN USERS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'role') THEN
    ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) DEFAULT 'admin';
  END IF;
END $$;

-- ===================================================================
-- 2. SAFELY CREATE/UPDATE CLINICS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add ALL clinic columns if they don't exist
DO $$
BEGIN
  -- Add clinic_name first (required)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'clinic_name') THEN
    ALTER TABLE clinics ADD COLUMN clinic_name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Clinic';
  END IF;

  -- Add password_hash (required)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'password_hash') THEN
    ALTER TABLE clinics ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT 'temp_hash';
  END IF;

  -- Add clinic_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'clinic_code') THEN
    ALTER TABLE clinics ADD COLUMN clinic_code VARCHAR(20);
  END IF;

  -- Add optional columns
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

-- Populate clinic_code for existing clinics without one
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

-- ===================================================================
-- 3. CREATE CARD BATCHES TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(20) UNIQUE NOT NULL,
  total_cards INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 4. CREATE CARDS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  control_number VARCHAR(20) UNIQUE NOT NULL,
  passcode VARCHAR(6) NOT NULL,
  status VARCHAR(20) DEFAULT 'unactivated',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to cards table
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

-- ===================================================================
-- 5. CREATE CARD PERKS TABLE
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

-- ===================================================================
-- 6. CREATE CARD TRANSACTIONS TABLE
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

-- ===================================================================
-- 7. ADD FOREIGN KEY CONSTRAINTS (SAFELY)
-- ===================================================================
DO $$
BEGIN
  -- card_batches -> admin_users
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'card_batches' AND constraint_name = 'card_batches_created_by_fkey') THEN
    ALTER TABLE card_batches ADD CONSTRAINT card_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES admin_users(id);
  END IF;

  -- cards -> card_batches
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'cards' AND constraint_name = 'cards_batch_id_fkey') THEN
    ALTER TABLE cards ADD CONSTRAINT cards_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES card_batches(id);
  END IF;

  -- cards -> clinics
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'cards' AND constraint_name = 'cards_assigned_clinic_id_fkey') THEN
    ALTER TABLE cards ADD CONSTRAINT cards_assigned_clinic_id_fkey FOREIGN KEY (assigned_clinic_id) REFERENCES clinics(id);
  END IF;

  -- card_perks -> cards
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'card_perks' AND constraint_name = 'card_perks_card_id_fkey') THEN
    ALTER TABLE card_perks ADD CONSTRAINT card_perks_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;
  END IF;

  -- card_perks -> clinics
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'card_perks' AND constraint_name = 'card_perks_claimed_by_clinic_fkey') THEN
    ALTER TABLE card_perks ADD CONSTRAINT card_perks_claimed_by_clinic_fkey FOREIGN KEY (claimed_by_clinic) REFERENCES clinics(id);
  END IF;

  -- card_transactions -> cards
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'card_transactions' AND constraint_name = 'card_transactions_card_id_fkey') THEN
    ALTER TABLE card_transactions ADD CONSTRAINT card_transactions_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards(id);
  END IF;
END $$;

-- ===================================================================
-- 8. CREATE INDEXES
-- ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cards_control_number') THEN
    CREATE INDEX idx_cards_control_number ON cards(control_number);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cards_status') THEN
    CREATE INDEX idx_cards_status ON cards(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cards_clinic') THEN
    CREATE INDEX idx_cards_clinic ON cards(assigned_clinic_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_card_perks_card_id') THEN
    CREATE INDEX idx_card_perks_card_id ON card_perks(card_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clinics_code') THEN
    CREATE INDEX idx_clinics_code ON clinics(clinic_code);
  END IF;
END $$;

-- ===================================================================
-- 9. ENABLE ROW LEVEL SECURITY & POLICIES
-- ===================================================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "Public access" ON admin_users;
CREATE POLICY "Public access" ON admin_users FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON clinics;
CREATE POLICY "Public access" ON clinics FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON card_batches;
CREATE POLICY "Public access" ON card_batches FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON cards;
CREATE POLICY "Public access" ON cards FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON card_perks;
CREATE POLICY "Public access" ON card_perks FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON card_transactions;
CREATE POLICY "Public access" ON card_transactions FOR ALL USING (true);

-- ===================================================================
-- 10. CREATE FUNCTIONS & TRIGGERS
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

DROP TRIGGER IF EXISTS trigger_create_default_perks ON cards;
CREATE TRIGGER trigger_create_default_perks
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_default_perks();

-- ===================================================================
-- 11. GRANT PERMISSIONS
-- ===================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ===================================================================
-- 12. INSERT DEFAULT DATA
-- ===================================================================
INSERT INTO admin_users (username, password_hash, role)
SELECT 'admin', '$2a$10$X3rM8GqQzK5J4Hy8xY2.wOtE6P7vN9qT3kL6zS4xR2mH8fW1cA9vK', 'superadmin'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');

INSERT INTO clinics (clinic_code, clinic_name, password_hash, contact_email, address)
SELECT 'DEMO001', 'Demo Dental Clinic', encode(sha256('demo123'::bytea), 'base64'), 'demo@clinic.com', '123 Demo Street'
WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE clinic_code = 'DEMO001');

-- ===================================================================
-- 13. VERIFICATION
-- ===================================================================
SELECT 'SETUP COMPLETE!' as status;

SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('admin_users', 'clinics', 'card_batches', 'cards', 'card_perks', 'card_transactions')
ORDER BY table_name;

SELECT 'Default Data:' as info,
       (SELECT COUNT(*) FROM admin_users) as admin_users,
       (SELECT COUNT(*) FROM clinics) as clinics;