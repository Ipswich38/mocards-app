-- ===================================================================
-- MOCARDS PRODUCTION OPTIMIZATION
-- Database indexes and performance optimizations for 3000+ cards and 300+ clinics
-- ===================================================================

-- Performance indexes for high-volume operations
CREATE INDEX IF NOT EXISTS idx_cards_control_number_unique ON public.cards(control_number);
CREATE INDEX IF NOT EXISTS idx_cards_batch_id_status ON public.cards(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_cards_assigned_clinic_status ON public.cards(assigned_clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON public.cards(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_activated_at ON public.cards(activated_at);
CREATE INDEX IF NOT EXISTS idx_cards_expires_at ON public.cards(expires_at);

-- Card perks optimization
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id_claimed ON public.card_perks(card_id, claimed);
CREATE INDEX IF NOT EXISTS idx_card_perks_type_claimed ON public.card_perks(perk_type, claimed);

-- Card transactions for audit trails
CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id_type ON public.card_transactions(card_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_card_transactions_created_at ON public.card_transactions(created_at);

-- Clinic optimizations
CREATE INDEX IF NOT EXISTS idx_clinics_code_unique ON public.mocards_clinics(clinic_code);
CREATE INDEX IF NOT EXISTS idx_clinics_name_search ON public.mocards_clinics USING gin(to_tsvector('english', clinic_name));
CREATE INDEX IF NOT EXISTS idx_clinics_active_subscription ON public.mocards_clinics(is_active, subscription_status);
CREATE INDEX IF NOT EXISTS idx_clinics_last_login ON public.mocards_clinics(last_login_at);

-- Clinic sales and performance tracking
CREATE INDEX IF NOT EXISTS idx_clinic_sales_date_clinic ON public.clinic_sales(sale_date, clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_sales_amount ON public.clinic_sales(sale_amount);
CREATE INDEX IF NOT EXISTS idx_clinic_sales_status ON public.clinic_sales(status);

-- Clinic perk redemptions
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_clinic_date ON public.clinic_perk_redemptions(clinic_id, redeemed_at);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_card_id ON public.clinic_perk_redemptions(card_id);

-- Appointment optimizations
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON public.appointments(assigned_clinic_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_control_number ON public.appointments(control_number);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at);

-- Appointment notifications
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_recipient ON public.appointment_notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_created ON public.appointment_notifications(created_at);

-- Card batch optimizations
CREATE INDEX IF NOT EXISTS idx_card_batches_created_by ON public.card_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_card_batches_created_at ON public.card_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_card_batches_batch_number ON public.card_batches(batch_number);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cards_clinic_status_activated ON public.cards(assigned_clinic_id, status, activated_at);
CREATE INDEX IF NOT EXISTS idx_cards_batch_control_number ON public.cards(batch_id, control_number);

-- Enable pg_trgm extension first for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search optimization for clinic names
CREATE INDEX IF NOT EXISTS idx_clinics_full_text_search ON public.mocards_clinics
USING gin((clinic_name || ' ' || coalesce(business_license, '') || ' ' || clinic_code) gin_trgm_ops);

-- Monthly reports optimization
CREATE INDEX IF NOT EXISTS idx_monthly_reports_clinic_period ON public.clinic_monthly_reports(clinic_id, report_year, report_month);

-- Subscription plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.clinic_subscription_plans(is_active, plan_name);

-- ===================================================================
-- PERFORMANCE VIEWS FOR COMMON OPERATIONS
-- ===================================================================

-- View for active cards by clinic
CREATE OR REPLACE VIEW clinic_active_cards AS
SELECT
    c.assigned_clinic_id as clinic_id,
    clinic.clinic_name,
    COUNT(*) as active_cards,
    COUNT(CASE WHEN c.status = 'activated' THEN 1 END) as activated_cards,
    COUNT(CASE WHEN c.status = 'unactivated' THEN 1 END) as pending_activation
FROM cards c
JOIN mocards_clinics clinic ON c.assigned_clinic_id = clinic.id
WHERE c.assigned_clinic_id IS NOT NULL
GROUP BY c.assigned_clinic_id, clinic.clinic_name;

-- View for card generation statistics
CREATE OR REPLACE VIEW card_generation_stats AS
SELECT
    cb.batch_number,
    cb.total_cards,
    cb.created_by,
    cb.created_at as batch_created,
    COUNT(c.id) as cards_created,
    COUNT(CASE WHEN c.status = 'activated' THEN 1 END) as cards_activated,
    COUNT(CASE WHEN c.assigned_clinic_id IS NOT NULL THEN 1 END) as cards_assigned
FROM card_batches cb
LEFT JOIN cards c ON cb.id = c.batch_id
GROUP BY cb.id, cb.batch_number, cb.total_cards, cb.created_by, cb.created_at
ORDER BY cb.created_at DESC;

-- View for clinic performance metrics
CREATE OR REPLACE VIEW clinic_performance AS
SELECT
    c.id as clinic_id,
    c.clinic_name,
    c.clinic_code,
    c.subscription_plan,
    c.cards_issued_this_month,
    c.monthly_card_limit,
    COALESCE(active_cards.total, 0) as total_active_cards,
    COALESCE(sales_stats.total_sales, 0) as total_sales,
    COALESCE(sales_stats.total_commission, 0) as total_commission_earned,
    COALESCE(redemptions.total_redemptions, 0) as total_redemptions,
    c.last_login_at
FROM mocards_clinics c
LEFT JOIN (
    SELECT assigned_clinic_id, COUNT(*) as total
    FROM cards
    WHERE status = 'activated'
    GROUP BY assigned_clinic_id
) active_cards ON c.id = active_cards.assigned_clinic_id
LEFT JOIN (
    SELECT clinic_id,
           COUNT(*) as total_sales,
           SUM(commission_amount) as total_commission
    FROM clinic_sales
    WHERE status = 'completed'
    GROUP BY clinic_id
) sales_stats ON c.id = sales_stats.clinic_id
LEFT JOIN (
    SELECT clinic_id, COUNT(*) as total_redemptions
    FROM clinic_perk_redemptions
    GROUP BY clinic_id
) redemptions ON c.id = redemptions.clinic_id
WHERE c.is_active = true;

-- ===================================================================
-- DATABASE OPTIMIZATION FUNCTIONS
-- ===================================================================

-- Function to get clinic dashboard statistics efficiently
CREATE OR REPLACE FUNCTION get_clinic_stats(clinic_id_param UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'active_cards', COALESCE(active_cards, 0),
        'pending_activation', COALESCE(pending_activation, 0),
        'total_sales', COALESCE(total_sales, 0),
        'total_commission', COALESCE(total_commission, 0),
        'total_redemptions', COALESCE(total_redemptions, 0),
        'pending_appointments', COALESCE(pending_appointments, 0)
    ) INTO result
    FROM (
        SELECT
            (SELECT COUNT(*) FROM cards WHERE assigned_clinic_id = clinic_id_param AND status = 'activated') as active_cards,
            (SELECT COUNT(*) FROM cards WHERE assigned_clinic_id = clinic_id_param AND status = 'unactivated') as pending_activation,
            (SELECT COALESCE(SUM(sale_amount), 0) FROM clinic_sales WHERE clinic_id = clinic_id_param AND status = 'completed') as total_sales,
            (SELECT COALESCE(SUM(commission_amount), 0) FROM clinic_sales WHERE clinic_id = clinic_id_param AND status = 'completed') as total_commission,
            (SELECT COUNT(*) FROM clinic_perk_redemptions WHERE clinic_id = clinic_id_param) as total_redemptions,
            (SELECT COUNT(*) FROM appointments WHERE assigned_clinic_id = clinic_id_param AND status = 'waiting_for_approval') as pending_appointments
    ) stats;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to efficiently search clinics
CREATE OR REPLACE FUNCTION search_clinics(search_term TEXT, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    clinic_name VARCHAR(255),
    clinic_code VARCHAR(10),
    business_license VARCHAR(100),
    subscription_plan VARCHAR(50),
    is_active BOOLEAN,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.clinic_name,
        c.clinic_code,
        c.business_license,
        c.subscription_plan,
        c.is_active,
        similarity(c.clinic_name || ' ' || c.clinic_code, search_term) as sim
    FROM mocards_clinics c
    WHERE
        c.clinic_name ILIKE '%' || search_term || '%'
        OR c.clinic_code ILIKE '%' || search_term || '%'
        OR c.business_license ILIKE '%' || search_term || '%'
    ORDER BY sim DESC, c.clinic_name
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- BATCH OPERATIONS FOR LARGE SCALE PROCESSING
-- ===================================================================

-- Function for bulk card generation with batch processing
CREATE OR REPLACE FUNCTION generate_card_batch_optimized(
    admin_id UUID,
    total_cards INTEGER,
    batch_size INTEGER DEFAULT 100
)
RETURNS JSON AS $$
DECLARE
    batch_record RECORD;
    batch_id UUID;
    batch_number VARCHAR(50);
    cards_created INTEGER := 0;
    current_batch INTEGER;
BEGIN
    -- Generate unique batch number
    batch_number := 'MOB-' || EXTRACT(EPOCH FROM NOW())::text;

    -- Create batch record
    INSERT INTO card_batches (batch_number, total_cards, created_by)
    VALUES (batch_number, total_cards, admin_id)
    RETURNING id INTO batch_id;

    -- Process in batches to avoid memory issues
    WHILE cards_created < total_cards LOOP
        current_batch := LEAST(batch_size, total_cards - cards_created);

        -- Insert cards in batch
        INSERT INTO cards (batch_id, control_number, passcode, location_code, status)
        SELECT
            batch_id,
            'MOC-' || LPAD((cards_created + row_number() OVER())::text, 6, '0'),
            LPAD((RANDOM() * 10000)::INTEGER::text, 4, '0'),
            'PHL',
            'unactivated'
        FROM generate_series(1, current_batch);

        cards_created := cards_created + current_batch;
    END LOOP;

    -- Return batch information
    RETURN json_build_object(
        'batch_id', batch_id,
        'batch_number', batch_number,
        'cards_created', cards_created,
        'status', 'completed'
    );
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- MONITORING AND MAINTENANCE
-- ===================================================================

-- Function to get database performance statistics
CREATE OR REPLACE FUNCTION get_database_performance_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_cards', (SELECT COUNT(*) FROM cards),
        'total_clinics', (SELECT COUNT(*) FROM mocards_clinics WHERE is_active = true),
        'total_batches', (SELECT COUNT(*) FROM card_batches),
        'active_cards', (SELECT COUNT(*) FROM cards WHERE status = 'activated'),
        'pending_activations', (SELECT COUNT(*) FROM cards WHERE status = 'unactivated'),
        'total_transactions', (SELECT COUNT(*) FROM card_transactions),
        'total_appointments', (SELECT COUNT(*) FROM appointments),
        'db_size_mb', pg_database_size(current_database()) / 1024 / 1024,
        'largest_tables', (
            SELECT json_agg(json_build_object('table', schemaname||'.'||tablename, 'size_mb', pg_total_relation_size(schemaname||'.'||tablename) / 1024 / 1024))
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update table statistics for better query planning
ANALYZE cards;
ANALYZE card_perks;
ANALYZE card_transactions;
ANALYZE mocards_clinics;
ANALYZE clinic_sales;
ANALYZE appointments;
ANALYZE card_batches;

-- Grant necessary permissions
GRANT SELECT ON clinic_active_cards TO authenticated, anon;
GRANT SELECT ON card_generation_stats TO authenticated, anon;
GRANT SELECT ON clinic_performance TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_clinic_stats(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_clinics(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_database_performance_stats() TO authenticated, anon;

SELECT 'Production optimization indexes and functions created successfully!' as status;