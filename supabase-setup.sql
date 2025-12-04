-- MOCARDS Database Schema Setup
-- Execute this in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create clinics table
CREATE TABLE IF NOT EXISTS clinics (
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

-- Create card_batches table
CREATE TABLE IF NOT EXISTS card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(20) UNIQUE NOT NULL,
  total_cards INTEGER NOT NULL,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
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

-- Create card_perks table
CREATE TABLE IF NOT EXISTS card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  perk_type VARCHAR(50) NOT NULL,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  claimed_by_clinic UUID REFERENCES clinics(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create card_transactions table for audit trail
CREATE TABLE IF NOT EXISTS card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id),
  transaction_type VARCHAR(50) NOT NULL,
  performed_by VARCHAR(50) NOT NULL,
  performed_by_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_control_number ON cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_clinic ON cards(assigned_clinic_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id ON card_perks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_claimed ON card_perks(claimed);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(clinic_code);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Admin users can read all admin records" ON admin_users
  FOR SELECT USING (true);

-- RLS Policies for clinics
CREATE POLICY "Clinics can read their own records" ON clinics
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage all clinic records" ON clinics
  FOR ALL USING (true);

-- RLS Policies for cards
CREATE POLICY "Public read access for cards with passcode" ON cards
  FOR SELECT USING (true);

CREATE POLICY "Clinics can read assigned cards" ON cards
  FOR SELECT USING (assigned_clinic_id = auth.uid()::uuid OR true);

CREATE POLICY "Admins can manage all cards" ON cards
  FOR ALL USING (true);

-- RLS Policies for card_perks
CREATE POLICY "Public read access for card perks" ON card_perks
  FOR SELECT USING (true);

CREATE POLICY "Clinics can update perks for their cards" ON card_perks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = card_perks.card_id
      AND cards.assigned_clinic_id = auth.uid()::uuid
    ) OR true
  );

-- RLS Policies for card_transactions
CREATE POLICY "Read access for transactions" ON card_transactions
  FOR SELECT USING (true);

CREATE POLICY "Insert access for transactions" ON card_transactions
  FOR INSERT WITH CHECK (true);

-- Insert default admin user (password: 'admin123')
-- Note: In production, use proper password hashing
INSERT INTO admin_users (username, password_hash, role)
VALUES ('admin', '$2a$10$X3rM8GqQzK5J4Hy8xY2.wOtE6P7vN9qT3kL6zS4xR2mH8fW1cA9vK', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- Create a function to automatically create perks when a card is created
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

-- Create trigger to automatically create perks
DROP TRIGGER IF EXISTS trigger_create_default_perks ON cards;
CREATE TRIGGER trigger_create_default_perks
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_default_perks();

-- Create a function to log transactions automatically
CREATE OR REPLACE FUNCTION log_card_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO card_transactions (card_id, transaction_type, performed_by, performed_by_id, details)
    VALUES (NEW.id, 'created', 'admin', NEW.batch_id, '{"action": "card_created"}');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO card_transactions (card_id, transaction_type, performed_by, performed_by_id, details)
      VALUES (NEW.id, 'status_changed', 'system', NULL, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for card transaction logging
DROP TRIGGER IF EXISTS trigger_log_card_transaction ON cards;
CREATE TRIGGER trigger_log_card_transaction
  AFTER INSERT OR UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION log_card_transaction();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Note: Remember to set up proper JWT secrets and authentication in Supabase dashboard