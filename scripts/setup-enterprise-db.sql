-- MOCARDS ENTERPRISE DATABASE SETUP
-- Run this script in your Supabase SQL editor to set up the modular architecture
-- Make sure to run these in order!

-- Step 1: Run the cloud isolation setup
\i supabase-schema/00-cloud-isolation-setup.sql

-- Step 2: Set up authentication schema
\i supabase-schema/01-authentication-schema.sql

-- Step 3: Set up clinics schema
\i supabase-schema/02-clinics-schema.sql

-- Step 4: Set up cards schema
\i supabase-schema/03-cards-schema.sql

-- Step 5: Insert default data for testing

-- Insert default clinic plans
INSERT INTO clinics.clinic_plans (name, description, max_cards, max_clinics, price_monthly, price_yearly, features) VALUES
('Starter', 'Perfect for small clinics', 100, 1, 29.99, 299.99, '{"support": "email", "features": ["basic_cards", "basic_analytics"]}'),
('Professional', 'For growing healthcare practices', 500, 3, 79.99, 799.99, '{"support": "priority", "features": ["advanced_cards", "analytics", "reporting"]}'),
('Enterprise', 'For large healthcare networks', 2000, 10, 199.99, 1999.99, '{"support": "dedicated", "features": ["unlimited_cards", "advanced_analytics", "custom_branding", "api_access"]}')
ON CONFLICT (name) DO NOTHING;

-- Insert default card categories
INSERT INTO cards.card_categories (name, description, color_scheme, is_active) VALUES
('Standard', 'Default card type for general use', '{"primary": "#3B82F6", "secondary": "#EFF6FF"}', true),
('Premium', 'Premium card with extended benefits', '{"primary": "#8B5CF6", "secondary": "#F3E8FF"}', true),
('VIP', 'VIP card for special members', '{"primary": "#F59E0B", "secondary": "#FEF3C7"}', true)
ON CONFLICT (name) DO NOTHING;

-- Insert demo clinic (for testing)
INSERT INTO clinics.clinics (
    name,
    code,
    email,
    contact_number,
    address,
    region,
    plan_id,
    password_hash,
    is_active,
    subscription_status
)
SELECT
    'Demo Medical Center',
    'DEMO001',
    'demo@mocards.cloud',
    '+63917123456',
    '123 Healthcare Ave, Makati City',
    'NCR',
    cp.id,
    'demo123', -- In production, this should be properly hashed
    true,
    'active'
FROM clinics.clinic_plans cp
WHERE cp.name = 'Professional'
ON CONFLICT (code) DO NOTHING;

-- Create demo admin user profile
INSERT INTO auth_mgmt.user_profiles (
    id,
    email,
    full_name,
    role,
    is_active
) VALUES (
    gen_random_uuid(),
    'admin@mocards.cloud',
    'System Administrator',
    'super_admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample cards for demo clinic
INSERT INTO cards.cards (
    control_number,
    full_name,
    birth_date,
    address,
    contact_number,
    emergency_contact,
    clinic_id,
    category_id,
    status,
    perks_total,
    perks_used,
    issue_date,
    expiry_date,
    qr_code_data,
    metadata
)
SELECT
    'MOC' || LPAD((ROW_NUMBER() OVER())::text, 8, '0'),
    'Patient ' || (ROW_NUMBER() OVER()),
    '1990-01-01'::date + (random() * 365 * 30)::int,
    'Patient Address ' || (ROW_NUMBER() OVER()),
    '+639171234' || LPAD((ROW_NUMBER() OVER())::text, 3, '0'),
    '+639181234' || LPAD((ROW_NUMBER() OVER())::text, 3, '0'),
    c.id,
    cat.id,
    CASE
        WHEN random() > 0.1 THEN 'active'
        ELSE 'inactive'
    END,
    10,
    floor(random() * 5)::int,
    CURRENT_DATE - (random() * 30)::int,
    CURRENT_DATE + (365 + random() * 365)::int,
    '{"control_number": "MOC' || LPAD((ROW_NUMBER() OVER())::text, 8, '0') || '"}',
    '{"demo": true}'::jsonb
FROM
    generate_series(1, 50) as series,
    clinics.clinics c,
    cards.card_categories cat
WHERE
    c.code = 'DEMO001'
    AND cat.name = 'Standard'
ON CONFLICT (control_number) DO NOTHING;

-- Enable real-time subscriptions for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE auth_mgmt.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE clinics.clinics;
ALTER PUBLICATION supabase_realtime ADD TABLE cards.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE auth_mgmt.security_events;

-- Create useful views for analytics

-- Cards overview view
CREATE OR REPLACE VIEW analytics.cards_overview AS
SELECT
    c.id,
    c.control_number,
    c.full_name,
    c.status,
    c.perks_total,
    c.perks_used,
    c.perks_total - c.perks_used AS perks_remaining,
    c.issue_date,
    c.expiry_date,
    CASE
        WHEN c.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN c.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'valid'
    END AS expiry_status,
    cl.name AS clinic_name,
    cl.region AS clinic_region,
    cat.name AS category_name
FROM cards.cards c
LEFT JOIN clinics.clinics cl ON c.clinic_id = cl.id
LEFT JOIN cards.card_categories cat ON c.category_id = cat.id;

-- Clinic statistics view
CREATE OR REPLACE VIEW analytics.clinic_statistics AS
SELECT
    cl.id,
    cl.name,
    cl.region,
    cp.name AS plan_name,
    cp.max_cards,
    COUNT(c.id) AS total_cards,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) AS active_cards,
    COUNT(CASE WHEN c.expiry_date < CURRENT_DATE THEN 1 END) AS expired_cards,
    SUM(c.perks_used) AS total_perks_used,
    SUM(c.perks_total - c.perks_used) AS total_perks_remaining
FROM clinics.clinics cl
LEFT JOIN clinics.clinic_plans cp ON cl.plan_id = cp.id
LEFT JOIN cards.cards c ON cl.id = c.clinic_id
GROUP BY cl.id, cl.name, cl.region, cp.name, cp.max_cards;

-- Security events summary view
CREATE OR REPLACE VIEW analytics.security_summary AS
SELECT
    DATE_TRUNC('day', created_at) AS event_date,
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM auth_mgmt.security_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), event_type
ORDER BY event_date DESC, event_type;

-- Grant permissions for views
GRANT SELECT ON analytics.cards_overview TO authenticated;
GRANT SELECT ON analytics.clinic_statistics TO authenticated;
GRANT SELECT ON analytics.security_summary TO authenticated;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cards_clinic_status ON cards.cards(clinic_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cards_expiry_status ON cards.cards(expiry_date, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_date_type ON auth_mgmt.security_events(created_at, event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_clinic_role ON auth_mgmt.user_profiles(clinic_id, role);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 MOCARDS Enterprise Database Setup Complete!';
    RAISE NOTICE '📊 Sample data inserted for testing';
    RAISE NOTICE '🔐 RLS policies enabled for security';
    RAISE NOTICE '📈 Analytics views created';
    RAISE NOTICE '⚡ Performance indexes added';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Demo Login Credentials:';
    RAISE NOTICE '   Clinic Code: DEMO001';
    RAISE NOTICE '   Password: demo123';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '   1. Update your .env with Supabase credentials';
    RAISE NOTICE '   2. Run npm install';
    RAISE NOTICE '   3. Run npm run dev';
END $$;