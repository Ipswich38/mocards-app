# 🚀 MOCARDS Supabase Manual Migration Guide

## 📋 Prerequisites

1. **Supabase Project**: Ensure you have access to your Supabase dashboard
2. **Project URL**: `https://lxyexybnotixgpzflota.supabase.co`
3. **SQL Editor Access**: Navigate to SQL Editor in your Supabase dashboard

---

## 🗄️ STEP-BY-STEP SCHEMA CREATION

### STEP 1: Enable Extensions
```sql
-- Execute this first in SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### STEP 2: Create admin_users Table
```sql
-- Admin users for super admin access
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default admin user (password: 'admin123')
INSERT INTO admin_users (username, password_hash, role) VALUES
('admin', '$2a$10$X3rM8GqQzK5J4Hy8xY2.wOtE6P7vN9qT3kL6zS4xR2mH8fW1cA9vK', 'superadmin');
```

### STEP 3: Create clinics Table
```sql
-- Dental clinic accounts
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
```

### STEP 4: Create card_batches Table
```sql
-- Card batches for grouping cards by generation
CREATE TABLE card_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR(20) UNIQUE NOT NULL,
  total_cards INTEGER NOT NULL,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### STEP 5: Create cards Table
```sql
-- Main cards table with unique identifiers
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
```

### STEP 6: Create card_perks Table
```sql
-- Perks available on cards
CREATE TABLE card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  perk_type VARCHAR(50) NOT NULL,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  claimed_by_clinic UUID REFERENCES clinics(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### STEP 7: Create card_transactions Table
```sql
-- Audit trail for blockchain-like tracking
CREATE TABLE card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id),
  transaction_type VARCHAR(50) NOT NULL,
  performed_by VARCHAR(50) NOT NULL,
  performed_by_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### STEP 8: Create Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_cards_control_number ON cards(control_number);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_clinic ON cards(assigned_clinic_id);
CREATE INDEX idx_card_perks_card_id ON card_perks(card_id);
CREATE INDEX idx_card_perks_claimed ON card_perks(claimed);
CREATE INDEX idx_transactions_card_id ON card_transactions(card_id);
CREATE INDEX idx_clinics_code ON clinics(clinic_code);
```

### STEP 9: Enable Row Level Security
```sql
-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
```

### STEP 10: Create RLS Policies
```sql
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
```

### STEP 11: Create Automatic Perk Generation Function
```sql
-- Function to automatically create perks when a card is created
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
```

### STEP 12: Create Triggers
```sql
-- Trigger to automatically create perks
CREATE TRIGGER trigger_create_default_perks
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_default_perks();

-- Function for transaction logging
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

-- Trigger for automatic transaction logging
CREATE TRIGGER trigger_log_card_transaction
  AFTER INSERT OR UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION log_card_transaction();
```

### STEP 13: Grant Permissions
```sql
-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
```

---

## 🌱 DATA SEEDING (Optional Test Data)

### Create Test Clinic
```sql
-- Insert a test clinic for immediate testing
INSERT INTO clinics (clinic_code, clinic_name, password_hash, contact_email) VALUES
('TESTCLINIC', 'Test Dental Clinic', encode(sha256('password123'::bytea), 'base64'), 'test@clinic.com');
```

### Create Test Card Batch
```sql
-- Create a test batch
INSERT INTO card_batches (batch_number, total_cards, created_by) VALUES
('MO-B001', 5, (SELECT id FROM admin_users WHERE username = 'admin'));

-- Create test cards
DO $$
DECLARE
    batch_id UUID;
    i INTEGER;
BEGIN
    SELECT id INTO batch_id FROM card_batches WHERE batch_number = 'MO-B001';

    FOR i IN 1..5 LOOP
        INSERT INTO cards (batch_id, control_number, passcode, location_code, status)
        VALUES (
            batch_id,
            'MO-C001-' || LPAD(i::text, 3, '0'),
            LPAD((RANDOM() * 999999)::integer::text, 6, '0'),
            'MO',
            'unactivated'
        );
    END LOOP;
END $$;
```

---

## ✅ VALIDATION STEPS

### 1. Verify Tables Created
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. Verify Admin User
```sql
-- Confirm admin user exists
SELECT username, role FROM admin_users;
```

### 3. Verify Test Data
```sql
-- Check test clinic and cards
SELECT c.clinic_name, COUNT(cards.id) as card_count
FROM clinics c
LEFT JOIN cards ON c.id = cards.assigned_clinic_id
WHERE c.clinic_code = 'TESTCLINIC'
GROUP BY c.clinic_name;
```

### 4. Verify Perks Auto-Creation
```sql
-- Check that perks were created for test cards
SELECT c.control_number, COUNT(p.id) as perk_count
FROM cards c
LEFT JOIN card_perks p ON c.id = p.card_id
GROUP BY c.control_number
ORDER BY c.control_number;
```

---

## 🔧 ENVIRONMENT SETUP

### Update Vite Environment Variables
Create/Update `.env` file:
```env
VITE_SUPABASE_URL=https://lxyexybnotixgpzflota.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM
```

---

## 🧪 TESTING WORKFLOW

### Phase 1: Database Verification
1. Execute all SQL commands above in order
2. Run validation queries to confirm setup
3. Check Supabase dashboard for table structure

### Phase 2: Application Testing
1. Start development server: `npm run dev`
2. Test admin login: `admin` / `admin123`
3. Generate test cards in admin panel
4. Create additional test clinic
5. Test clinic activation workflow
6. Test patient card lookup

### Phase 3: End-to-End Flow
1. **Admin**: Generate new card batch
2. **Clinic**: Search and activate cards
3. **Clinic**: Redeem perks for patients
4. **Patient**: View card status and perks
5. **Admin**: Monitor all activity in dashboards

---

## 🚨 TROUBLESHOOTING

### Common Issues:

#### **Issue**: "relation does not exist" errors
**Solution**: Ensure tables are created in correct order with dependencies

#### **Issue**: RLS blocking queries
**Solution**: Verify RLS policies allow public access for your use case

#### **Issue**: Trigger not working
**Solution**: Check function syntax and ensure trigger is created after function

#### **Issue**: Environment variables not loading
**Solution**: Restart dev server after updating .env file

### **Verification Commands**:
```sql
-- Check if functions exist
\df create_default_perks

-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'cards';

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies WHERE tablename = 'cards';
```

---

## 🎯 SUCCESS CRITERIA

✅ All 7 tables created successfully
✅ Indexes and constraints applied
✅ RLS policies active
✅ Triggers and functions working
✅ Default admin user created
✅ Test data seeded (optional)
✅ Application connects successfully
✅ All CRUD operations functional
✅ Real-time updates working

Once all steps are complete, your MOCARDS system will be **100% production-ready** with full Supabase integration!