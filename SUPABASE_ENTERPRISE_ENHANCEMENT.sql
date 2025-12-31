-- ===============================================
-- ENTERPRISE ENHANCEMENTS - BUILDS ON WORKING BASE
-- ===============================================
-- This script adds enterprise features ON TOP of the working clinic management
-- Run this AFTER SUPABASE_WORKING_CLINIC_FIX.sql is working
-- Adds: Advanced Security, Audit Logging, Analytics, Compliance

-- ===============================================
-- STEP 1: ENTERPRISE SECURITY ENHANCEMENTS
-- ===============================================

-- Add enterprise security columns to existing clinics table
DO $$
BEGIN
    -- Security enhancements
    BEGIN ALTER TABLE public.clinics ADD COLUMN salt TEXT DEFAULT encode(gen_random_bytes(32), 'hex'); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN failed_login_attempts INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN two_factor_secret TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN security_questions JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;

    -- Session management
    BEGIN ALTER TABLE public.clinics ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN session_token TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN login_ip_history JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;

    RAISE NOTICE '✅ Enterprise security columns added';
END $$;

-- ===============================================
-- STEP 2: ENTERPRISE BUSINESS ENHANCEMENTS
-- ===============================================

-- Add business intelligence and financial tracking
DO $$
BEGIN
    -- Financial tracking
    BEGIN ALTER TABLE public.clinics ADD COLUMN current_balance DECIMAL(10,2) DEFAULT 0.00; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN currency_code VARCHAR(3) DEFAULT 'PHP'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN billing_address JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;

    -- Usage analytics
    BEGIN ALTER TABLE public.clinics ADD COLUMN current_month_cards INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN monthly_card_limit INTEGER DEFAULT 500; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN total_revenue DECIMAL(12,2) DEFAULT 0.00; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN performance_metrics JSONB DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;

    RAISE NOTICE '✅ Enterprise business columns added';
END $$;

-- ===============================================
-- STEP 3: ENTERPRISE COMPLIANCE ENHANCEMENTS
-- ===============================================

-- Add compliance and regulatory features
DO $$
BEGIN
    -- Compliance tracking
    BEGIN ALTER TABLE public.clinics ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN gdpr_consent BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN data_retention_days INTEGER DEFAULT 2555; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN compliance_status VARCHAR(20) DEFAULT 'compliant'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN regulatory_notes TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;

    -- Audit trail
    BEGIN ALTER TABLE public.clinics ADD COLUMN created_by VARCHAR(100) DEFAULT 'system'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN updated_by VARCHAR(100) DEFAULT 'system'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN ip_address INET; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.clinics ADD COLUMN user_agent TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;

    RAISE NOTICE '✅ Enterprise compliance columns added';
END $$;

-- ===============================================
-- STEP 4: ENTERPRISE AUDIT SYSTEM (COMPATIBLE)
-- ===============================================

-- Create compatible audit system that works with existing constraints
CREATE TABLE IF NOT EXISTS public.clinic_activity_log (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER REFERENCES public.clinics(id),
    clinic_code VARCHAR(20) NOT NULL,  -- Required by your existing constraint
    activity_type VARCHAR(50) NOT NULL,
    activity_category VARCHAR(20) DEFAULT 'GENERAL',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    risk_level VARCHAR(10) DEFAULT 'LOW',
    performed_by VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enterprise session tracking
CREATE TABLE IF NOT EXISTS public.clinic_sessions_enhanced (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER REFERENCES public.clinics(id),
    clinic_code VARCHAR(20) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    location_data JSONB,
    device_fingerprint TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0,
    activities_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- ===============================================
-- STEP 5: ENTERPRISE ANALYTICS FUNCTIONS
-- ===============================================

-- Function to calculate clinic performance score
CREATE OR REPLACE FUNCTION calculate_clinic_performance(clinic_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    usage_ratio DECIMAL;
    activity_score INTEGER;
BEGIN
    SELECT
        CASE
            WHEN max_cards_allowed > 0 THEN
                (cards_generated_count::DECIMAL / max_cards_allowed::DECIMAL) * 100
            ELSE 0
        END,
        CASE
            WHEN last_activity > NOW() - INTERVAL '7 days' THEN 25
            WHEN last_activity > NOW() - INTERVAL '30 days' THEN 15
            WHEN last_activity > NOW() - INTERVAL '90 days' THEN 5
            ELSE 0
        END
    INTO usage_ratio, activity_score
    FROM public.clinics
    WHERE id = clinic_id_param;

    score := LEAST(100, GREATEST(0,
        (CASE
            WHEN usage_ratio < 50 THEN usage_ratio::INTEGER
            WHEN usage_ratio < 80 THEN (50 + (usage_ratio - 50) * 1.5)::INTEGER
            ELSE (50 + 45 + (usage_ratio - 80) * 0.25)::INTEGER
        END) + activity_score
    ));

    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to get clinic analytics dashboard data
CREATE OR REPLACE FUNCTION get_clinic_analytics(clinic_id_param INTEGER)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'clinic_info', jsonb_build_object(
            'id', id,
            'name', name,
            'code', code,
            'plan', plan,
            'status', subscription_status
        ),
        'usage_stats', jsonb_build_object(
            'cards_generated', cards_generated_count,
            'max_allowed', max_cards_allowed,
            'utilization_percentage',
                CASE
                    WHEN max_cards_allowed > 0 THEN
                        ROUND((cards_generated_count::DECIMAL / max_cards_allowed::DECIMAL) * 100, 2)
                    ELSE 0
                END,
            'current_month_usage', current_month_cards,
            'monthly_limit', monthly_card_limit
        ),
        'financial_info', jsonb_build_object(
            'current_balance', current_balance,
            'billing_cycle', billing_cycle,
            'subscription_start', subscription_start_date,
            'subscription_end', subscription_end_date
        ),
        'security_status', jsonb_build_object(
            'two_factor_enabled', two_factor_enabled,
            'failed_attempts', failed_login_attempts,
            'locked', locked_until IS NOT NULL AND locked_until > NOW(),
            'last_activity', last_activity
        ),
        'compliance', jsonb_build_object(
            'gdpr_consent', gdpr_consent,
            'terms_accepted', terms_accepted_at IS NOT NULL,
            'status', compliance_status,
            'data_retention_days', data_retention_days
        ),
        'performance_score', calculate_clinic_performance(id)
    ) INTO result
    FROM public.clinics
    WHERE id = clinic_id_param;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- STEP 6: ENTERPRISE INDEXES FOR PERFORMANCE
-- ===============================================

-- Security monitoring indexes
CREATE INDEX IF NOT EXISTS idx_clinics_security_failed_logins ON public.clinics(failed_login_attempts) WHERE failed_login_attempts > 0;
CREATE INDEX IF NOT EXISTS idx_clinics_security_locked ON public.clinics(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clinics_security_2fa ON public.clinics(two_factor_enabled) WHERE two_factor_enabled = true;

-- Business intelligence indexes
CREATE INDEX IF NOT EXISTS idx_clinics_performance ON public.clinics(plan, subscription_status, current_balance);
CREATE INDEX IF NOT EXISTS idx_clinics_usage ON public.clinics(cards_generated_count, max_cards_allowed);
CREATE INDEX IF NOT EXISTS idx_clinics_activity ON public.clinics(last_activity);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_clinics_compliance ON public.clinics(gdpr_consent, compliance_status);
CREATE INDEX IF NOT EXISTS idx_clinics_subscription ON public.clinics(subscription_status, subscription_end_date);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_clinic_id ON public.clinic_activity_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON public.clinic_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_risk ON public.clinic_activity_log(risk_level);

-- ===============================================
-- STEP 7: ENTERPRISE TRIGGERS (SAFE)
-- ===============================================

-- Function to log clinic activities
CREATE OR REPLACE FUNCTION log_clinic_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log significant changes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.clinic_activity_log (
            clinic_id, clinic_code, activity_type, activity_category,
            description, performed_by, created_at
        ) VALUES (
            NEW.id, NEW.code, 'CLINIC_CREATED', 'CREATION',
            'New clinic registered: ' || NEW.name,
            COALESCE(NEW.created_by, 'system'),
            NOW()
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log security-related changes
        IF OLD.password_hash != NEW.password_hash THEN
            INSERT INTO public.clinic_activity_log (
                clinic_id, clinic_code, activity_type, activity_category,
                description, risk_level, performed_by, created_at
            ) VALUES (
                NEW.id, NEW.code, 'PASSWORD_CHANGED', 'SECURITY',
                'Password was updated',
                'HIGH',
                COALESCE(NEW.updated_by, 'system'),
                NOW()
            );
        END IF;

        -- Log status changes
        IF OLD.is_active != NEW.is_active THEN
            INSERT INTO public.clinic_activity_log (
                clinic_id, clinic_code, activity_type, activity_category,
                description, performed_by, created_at
            ) VALUES (
                NEW.id, NEW.code,
                CASE WHEN NEW.is_active THEN 'CLINIC_ACTIVATED' ELSE 'CLINIC_DEACTIVATED' END,
                'STATUS',
                'Clinic status changed from ' || OLD.is_active || ' to ' || NEW.is_active,
                COALESCE(NEW.updated_by, 'system'),
                NOW()
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create activity logging trigger (safe)
DO $$
BEGIN
    DROP TRIGGER IF EXISTS clinic_activity_trigger ON public.clinics;
    CREATE TRIGGER clinic_activity_trigger
        AFTER INSERT OR UPDATE ON public.clinics
        FOR EACH ROW EXECUTE FUNCTION log_clinic_activity();
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not create activity trigger: %', SQLERRM;
END $$;

-- ===============================================
-- STEP 8: ENTERPRISE DATA SEEDING
-- ===============================================

-- Update existing test clinics with enterprise features
UPDATE public.clinics
SET
    current_balance = 5000.00,
    billing_cycle = 'monthly',
    subscription_start_date = NOW() - INTERVAL '1 month',
    gdpr_consent = true,
    terms_accepted_at = NOW() - INTERVAL '1 month',
    compliance_status = 'compliant',
    two_factor_enabled = false,
    performance_metrics = '{"uptime": 99.5, "response_time": 120, "satisfaction": 4.8}'
WHERE username IN ('enterprise_test_admin', 'premium_test_admin');

-- ===============================================
-- STEP 9: ENTERPRISE VERIFICATION & ANALYTICS
-- ===============================================

-- Show enhanced clinic information
SELECT '🏆 ENTERPRISE ENHANCEMENTS DEPLOYED!' as "STATUS";

-- Show enhanced table structure
SELECT '🏗️ ENHANCED CLINICS TABLE STRUCTURE:' as "INFO";
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clinics' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show enterprise analytics for test clinics
SELECT '📊 ENTERPRISE ANALYTICS SAMPLE:' as "ANALYTICS";
SELECT
    id, name, code, plan,
    calculate_clinic_performance(id) as "Performance_Score",
    current_balance as "Balance",
    two_factor_enabled as "2FA_Enabled",
    compliance_status as "Compliance"
FROM public.clinics
WHERE username IN ('enterprise_test_admin', 'premium_test_admin');

-- Show activity log sample
SELECT '📋 ACTIVITY LOG SAMPLE:' as "ACTIVITY";
SELECT clinic_code, activity_type, activity_category, risk_level, created_at
FROM public.clinic_activity_log
ORDER BY created_at DESC
LIMIT 10;

-- Test analytics function
SELECT '🔍 DETAILED ANALYTICS SAMPLE:' as "DETAILED_ANALYTICS";
SELECT get_clinic_analytics(id) as "Analytics_Data"
FROM public.clinics
WHERE username = 'enterprise_test_admin'
LIMIT 1;

SELECT '✅ ENTERPRISE CLINIC MANAGEMENT - FULL FEATURE SET DEPLOYED!' as "FINAL_STATUS";