-- Final Production Schema for Location-Based Passcode System
-- Supports metadata-rich card generation with location assignment

-- Add new columns to card_batches table for enhanced metadata
ALTER TABLE card_batches
ADD COLUMN IF NOT EXISTS batch_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cards_generated INTEGER DEFAULT 0;

-- Add new columns to cards table for enhanced metadata and location assignment
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS card_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS location_code VARCHAR(3) DEFAULT 'PHL',
ADD COLUMN IF NOT EXISTS assigned_clinic_id UUID REFERENCES mocards_clinics(id);

-- Update card status enum to include location_pending
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_status_check;

    -- Add new constraint with location_pending status
    ALTER TABLE cards ADD CONSTRAINT cards_status_check
    CHECK (status IN ('unactivated', 'location_pending', 'activated', 'expired'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create location_code_assignments table for tracking location assignments
CREATE TABLE IF NOT EXISTS location_code_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES mocards_clinics(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
    location_code VARCHAR(3) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255),
    UNIQUE(card_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_assigned_clinic ON cards(assigned_clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_location_code ON cards(location_code);
CREATE INDEX IF NOT EXISTS idx_cards_status_location ON cards(status, location_code);
CREATE INDEX IF NOT EXISTS idx_location_assignments_clinic ON location_code_assignments(clinic_id);

-- Update card_transactions to support enhanced transaction types
ALTER TABLE card_transactions
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- Create a function to generate unique control numbers
CREATE OR REPLACE FUNCTION generate_control_number(batch_prefix TEXT, card_position INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN batch_prefix || '-' || LPAD(card_position::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate incomplete passcodes (4 digits only)
CREATE OR REPLACE FUNCTION generate_incomplete_passcode()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create a function to complete passcode with location code
CREATE OR REPLACE FUNCTION complete_passcode(location_code TEXT, incomplete_passcode TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(location_code) || incomplete_passcode;
END;
$$ LANGUAGE plpgsql;

-- Update clinic_sales table to handle location assignments
ALTER TABLE clinic_sales
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- Add RLS policies for enhanced card system
ALTER TABLE location_code_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinics can manage their location assignments" ON location_code_assignments
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        clinic_id IN (
            SELECT id FROM mocards_clinics
            WHERE id = clinic_id
        )
    );

CREATE POLICY "Admin can manage all location assignments" ON location_code_assignments
    FOR ALL USING (
        auth.role() = 'service_role' OR
        auth.uid() IN (SELECT id FROM mocards_admin_users WHERE is_active = true)
    );

-- Add constraints to ensure data integrity (safe method)
DO $$
BEGIN
    ALTER TABLE cards ADD CONSTRAINT valid_location_code CHECK (LENGTH(location_code) = 3);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create view for enhanced card information
CREATE OR REPLACE VIEW enhanced_card_view AS
SELECT
    c.*,
    cb.batch_number,
    cb.batch_metadata,
    mc.clinic_name,
    mc.clinic_code,
    lca.assigned_at as location_assigned_at,
    lca.assigned_by as location_assigned_by,
    (
        SELECT COUNT(*)
        FROM card_perks cp
        WHERE cp.card_id = c.id AND cp.claimed = false
    ) as available_perks_count,
    (
        SELECT COUNT(*)
        FROM card_perks cp
        WHERE cp.card_id = c.id AND cp.claimed = true
    ) as claimed_perks_count
FROM cards c
LEFT JOIN card_batches cb ON c.batch_id = cb.id
LEFT JOIN mocards_clinics mc ON c.assigned_clinic_id = mc.id
LEFT JOIN location_code_assignments lca ON c.id = lca.card_id;

-- Grant necessary permissions
GRANT SELECT ON enhanced_card_view TO authenticated;
GRANT ALL ON location_code_assignments TO authenticated;

-- Insert default card metadata template
CREATE OR REPLACE FUNCTION get_default_card_metadata()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'batch_creation_date', CURRENT_TIMESTAMP,
        'card_position_in_batch', 1,
        'total_perks_count', 8,
        'initial_perks', ARRAY['consultation', 'cleaning', 'extraction', 'fluoride', 'whitening', 'xray', 'denture', 'braces'],
        'validity_period_months', 12
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default batch metadata template
CREATE OR REPLACE FUNCTION get_default_batch_metadata(admin_user_id UUID, distribution_plan TEXT DEFAULT 'general')
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'generation_timestamp', CURRENT_TIMESTAMP,
        'admin_user', admin_user_id,
        'intended_distribution', distribution_plan,
        'expiry_period', 12
    );
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update card counts in batches
CREATE OR REPLACE FUNCTION update_batch_card_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE card_batches
    SET cards_generated = (
        SELECT COUNT(*)
        FROM cards
        WHERE batch_id = NEW.batch_id
    )
    WHERE id = NEW.batch_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure clean state
DROP TRIGGER IF EXISTS trigger_update_batch_count ON cards;
CREATE TRIGGER trigger_update_batch_count
    AFTER INSERT ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_card_count();