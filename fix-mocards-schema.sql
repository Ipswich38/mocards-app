-- ===================================================================
-- MOCARDS SCHEMA FIX - Safe update for existing database
-- ===================================================================

-- Create dedicated schema for MOCARDS if it doesn't exist
CREATE SCHEMA IF NOT EXISTS mocards;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. CREATE MOCARDS TABLES (if they don't exist)
-- ===================================================================

-- Admin users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mocards' AND table_name = 'admin_users') THEN
        CREATE TABLE mocards.admin_users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- Clinics table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mocards' AND table_name = 'clinics') THEN
        CREATE TABLE mocards.clinics (
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
    END IF;
END $$;

-- Card batches table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mocards' AND table_name = 'card_batches') THEN
        CREATE TABLE mocards.card_batches (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          batch_number VARCHAR(20) UNIQUE NOT NULL,
          total_cards INTEGER NOT NULL,
          created_by UUID REFERENCES mocards.admin_users(id),
          created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- Cards table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mocards' AND table_name = 'cards') THEN
        CREATE TABLE mocards.cards (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          batch_id UUID REFERENCES mocards.card_batches(id),
          control_number VARCHAR(20) UNIQUE NOT NULL,
          passcode VARCHAR(6) NOT NULL,
          location_code VARCHAR(10) DEFAULT 'MO',
          status VARCHAR(20) DEFAULT 'unactivated',
          assigned_clinic_id UUID REFERENCES mocards.clinics(id),
          activated_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- Card perks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mocards' AND table_name = 'card_perks') THEN
        CREATE TABLE mocards.card_perks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          card_id UUID REFERENCES mocards.cards(id) ON DELETE CASCADE,
          perk_type VARCHAR(50) NOT NULL,
          claimed BOOLEAN DEFAULT false,
          claimed_at TIMESTAMP,
          claimed_by_clinic UUID REFERENCES mocards.clinics(id),
          created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- Card transactions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mocards' AND table_name = 'card_transactions') THEN
        CREATE TABLE mocards.card_transactions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          card_id UUID REFERENCES mocards.cards(id),
          transaction_type VARCHAR(50) NOT NULL,
          performed_by VARCHAR(50) NOT NULL,
          performed_by_id UUID,
          details JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- ===================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ===================================================================
ALTER TABLE mocards.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mocards.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mocards.card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE mocards.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mocards.card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mocards.card_transactions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 3. CREATE RLS POLICIES (drop existing if they exist)
-- ===================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "MOCARDS admin users can read all admin records" ON mocards.admin_users;
DROP POLICY IF EXISTS "MOCARDS public read access for clinics" ON mocards.clinics;
DROP POLICY IF EXISTS "MOCARDS admins can manage all clinic records" ON mocards.clinics;
DROP POLICY IF EXISTS "MOCARDS public read access for cards" ON mocards.cards;
DROP POLICY IF EXISTS "MOCARDS admins can manage all cards" ON mocards.cards;
DROP POLICY IF EXISTS "MOCARDS public read access for card perks" ON mocards.card_perks;
DROP POLICY IF EXISTS "MOCARDS update perks access" ON mocards.card_perks;
DROP POLICY IF EXISTS "MOCARDS insert perks access" ON mocards.card_perks;
DROP POLICY IF EXISTS "MOCARDS read access for transactions" ON mocards.card_transactions;
DROP POLICY IF EXISTS "MOCARDS insert access for transactions" ON mocards.card_transactions;

-- Create new policies
CREATE POLICY "MOCARDS admin users can read all admin records" ON mocards.admin_users FOR SELECT USING (true);
CREATE POLICY "MOCARDS public read access for clinics" ON mocards.clinics FOR SELECT USING (true);
CREATE POLICY "MOCARDS admins can manage all clinic records" ON mocards.clinics FOR ALL USING (true);
CREATE POLICY "MOCARDS public read access for cards" ON mocards.cards FOR SELECT USING (true);
CREATE POLICY "MOCARDS admins can manage all cards" ON mocards.cards FOR ALL USING (true);
CREATE POLICY "MOCARDS public read access for card perks" ON mocards.card_perks FOR SELECT USING (true);
CREATE POLICY "MOCARDS update perks access" ON mocards.card_perks FOR UPDATE USING (true);
CREATE POLICY "MOCARDS insert perks access" ON mocards.card_perks FOR INSERT WITH CHECK (true);
CREATE POLICY "MOCARDS read access for transactions" ON mocards.card_transactions FOR SELECT USING (true);
CREATE POLICY "MOCARDS insert access for transactions" ON mocards.card_transactions FOR INSERT WITH CHECK (true);

-- ===================================================================
-- 4. GRANT PERMISSIONS
-- ===================================================================
GRANT USAGE ON SCHEMA mocards TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA mocards TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA mocards TO anon, authenticated;

-- ===================================================================
-- 5. FIX DEMO CREDENTIALS - Use proper bcrypt hashes
-- ===================================================================

-- Delete existing demo data if it exists
DELETE FROM mocards.admin_users WHERE username = 'admin';
DELETE FROM mocards.clinics WHERE clinic_code = 'DEMO001';

-- Insert admin user with bcrypt hash for 'admin123'
INSERT INTO mocards.admin_users (username, password_hash, role) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin');

-- Insert demo clinic with bcrypt hash for 'demo123'
INSERT INTO mocards.clinics (clinic_code, clinic_name, password_hash, contact_email, address) VALUES
('DEMO001', 'Demo Dental Clinic', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'demo@clinic.com', '123 Demo Street, Demo City');

-- ===================================================================
-- 6. VERIFICATION
-- ===================================================================

SELECT
    'MOCARDS Setup Complete!' as status,
    COUNT(*) as tables_created
FROM information_schema.tables
WHERE table_schema = 'mocards';

SELECT
    'Demo Credentials Ready:' as info,
    'admin / admin123' as admin_login,
    'DEMO001 / demo123' as clinic_login;

-- ===================================================================
-- DONE! Your MOCARDS tables are now ready with proper bcrypt passwords
-- ===================================================================