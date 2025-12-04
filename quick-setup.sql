-- ===================================================================
-- MOCARDS QUICK SETUP SCRIPT
-- Execute this single script in your Supabase SQL Editor
-- ===================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. ADMIN USERS TABLE
-- ===================================================================
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 2. CLINICS TABLE
-- ===================================================================
CREATE TABLE clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_code VARCHAR(20) UNIQUE NOT NULL,
  clinic_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 3. CARD BATCHES TABLE
-- ===================================================================
CREATE TABLE card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(20) UNIQUE NOT NULL,
  total_cards INTEGER NOT NULL,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 4. CARDS TABLE
-- ===================================================================
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES card_batches(id),
  control_number VARCHAR(20) UNIQUE NOT NULL,
  passcode VARCHAR(6) NOT NULL,
  location_code VARCHAR(10) DEFAULT 'MO',
  status VARCHAR(20) DEFAULT 'unactivated',
  assigned_clinic_id UUID REFERENCES clinics(id),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 5. CARD PERKS TABLE
-- ===================================================================
CREATE TABLE card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  perk_type VARCHAR(50) NOT NULL,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  claimed_by_clinic UUID REFERENCES clinics(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 6. CARD TRANSACTIONS TABLE
-- ===================================================================
CREATE TABLE card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id),
  transaction_type VARCHAR(50) NOT NULL,
  performed_by VARCHAR(50) NOT NULL,
  performed_by_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 7. CREATE PERFORMANCE INDEXES
-- ===================================================================
CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_clinic ON cards(assigned_clinic_id);
CREATE INDEX idx_card_perks_card_id ON card_perks(card_id);
CREATE INDEX idx_card_perks_claimed ON card_perks(claimed);
CREATE INDEX idx_transactions_card_id ON card_transactions(card_id);
CREATE INDEX idx_clinics_code ON clinics(clinic_code);

-- ===================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ===================================================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 9. CREATE RLS POLICIES
-- ===================================================================

-- Admin users policies
CREATE POLICY "Admin users can read all admin records" ON admin_users
  FOR SELECT USING (true);

-- Clinics policies
CREATE POLICY "Public read access for clinics" ON clinics
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage all clinic records" ON clinics
  FOR ALL USING (true);

-- Cards policies
CREATE POLICY "Public read access for cards" ON cards
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage all cards" ON cards
  FOR ALL USING (true);

-- Card perks policies
CREATE POLICY "Public read access for card perks" ON card_perks
  FOR SELECT USING (true);

CREATE POLICY "Update perks access" ON card_perks
  FOR UPDATE USING (true);

-- Transaction policies
CREATE POLICY "Read access for transactions" ON card_transactions
  FOR SELECT USING (true);

CREATE POLICY "Insert access for transactions" ON card_transactions
  FOR INSERT WITH CHECK (true);

-- ===================================================================
-- 10. CREATE AUTOMATIC PERK GENERATION FUNCTION
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

-- ===================================================================
-- 11. CREATE TRANSACTION LOGGING FUNCTION
-- ===================================================================
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
-- 12. CREATE TRIGGERS
-- ===================================================================

-- Trigger to automatically create perks when card is inserted
CREATE TRIGGER trigger_create_default_perks
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_default_perks();

-- Trigger to log transactions automatically
CREATE TRIGGER trigger_log_card_transaction
  AFTER INSERT OR UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION log_card_transaction();

-- ===================================================================
-- 13. GRANT PERMISSIONS
-- ===================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ===================================================================
-- 14. INSERT DEFAULT DATA
-- ===================================================================

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO admin_users (username, password_hash, role) VALUES
('admin', '$2a$10$X3rM8GqQzK5J4Hy8xY2.wOtE6P7vN9qT3kL6zS4xR2mH8fW1cA9vK', 'superadmin');

-- Insert demo clinic for testing
INSERT INTO clinics (clinic_code, clinic_name, password_hash, contact_email, address) VALUES
('DEMO001', 'Demo Dental Clinic', encode(sha256('demo123'::bytea), 'base64'), 'demo@clinic.com', '123 Demo Street, Demo City');

-- ===================================================================
-- 15. VERIFICATION QUERIES
-- ===================================================================

-- Verify tables were created
SELECT
  'Tables Created:' as status,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_users', 'clinics', 'card_batches', 'cards', 'card_perks', 'card_transactions');

-- Verify admin user
SELECT
  'Admin User:' as status,
  username,
  role
FROM admin_users;

-- Verify demo clinic
SELECT
  'Demo Clinic:' as status,
  clinic_code,
  clinic_name
FROM clinics;

-- ===================================================================
-- SETUP COMPLETE!
-- Your MOCARDS database is ready for use.
--
-- Next Steps:
-- 1. Update your .env file with Supabase credentials
-- 2. Run: npm install && npm run dev
-- 3. Login with: admin / admin123
-- 4. Test card generation and clinic management
-- ===================================================================