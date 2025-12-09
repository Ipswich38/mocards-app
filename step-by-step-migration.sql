-- ===================================================================
-- STEP-BY-STEP MOCARDS MIGRATION
-- Apply schema changes in correct order to avoid dependency issues
-- ===================================================================

-- Step 1: Create perk management tables first
-- ===================================================================

-- Create perk categories table
CREATE TABLE IF NOT EXISTS public.perk_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create master perk templates table
CREATE TABLE IF NOT EXISTS public.perk_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  perk_type VARCHAR(100) NOT NULL,
  default_value DECIMAL(10,2) DEFAULT 0.00,
  category VARCHAR(100),
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false,
  created_by_admin_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create clinic-specific perk customizations table
CREATE TABLE IF NOT EXISTS public.clinic_perk_customizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.mocards_clinics(id) ON DELETE CASCADE,
  perk_template_id UUID REFERENCES public.perk_templates(id) ON DELETE CASCADE,
  custom_name VARCHAR(255),
  custom_description TEXT,
  custom_value DECIMAL(10,2),
  is_enabled BOOLEAN DEFAULT true,
  requires_appointment BOOLEAN DEFAULT false,
  max_redemptions_per_card INTEGER DEFAULT 1,
  valid_from DATE,
  valid_until DATE,
  terms_and_conditions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, perk_template_id)
);

-- Create perk usage analytics table
CREATE TABLE IF NOT EXISTS public.perk_usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perk_template_id UUID REFERENCES public.perk_templates(id),
  clinic_id UUID REFERENCES public.mocards_clinics(id),
  card_id UUID REFERENCES public.cards(id),
  redemption_date DATE NOT NULL,
  redemption_value DECIMAL(10,2),
  month_year VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Insert default data
-- ===================================================================

-- Insert default perk categories
INSERT INTO public.perk_categories (name, description, display_order) VALUES
('Dental Services', 'General dental care services', 1),
('Diagnostics', 'X-rays, examinations and diagnostic procedures', 2),
('Preventive Care', 'Cleanings, fluoride treatments and preventive services', 3),
('Cosmetic', 'Teeth whitening, veneers and cosmetic procedures', 4),
('Orthodontics', 'Braces, aligners and orthodontic treatments', 5),
('Oral Surgery', 'Extractions, implants and surgical procedures', 6),
('Restorative', 'Fillings, crowns, bridges and restorative work', 7),
('Custom Services', 'Clinic-specific custom services', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert default perk templates
INSERT INTO public.perk_templates (name, description, perk_type, default_value, category, icon, is_system_default) VALUES
('Dental Consultation', 'Comprehensive dental examination and consultation', 'consultation', 500.00, 'Dental Services', 'stethoscope', true),
('Dental Cleaning', 'Professional dental cleaning and polishing', 'cleaning', 800.00, 'Preventive Care', 'sparkles', true),
('Tooth Extraction', 'Simple tooth extraction procedure', 'extraction', 1500.00, 'Oral Surgery', 'scissors', true),
('Fluoride Treatment', 'Fluoride application for cavity prevention', 'fluoride', 300.00, 'Preventive Care', 'shield', true),
('Teeth Whitening', 'Professional teeth whitening treatment', 'whitening', 2500.00, 'Cosmetic', 'sun', true),
('Dental X-Ray', 'Digital dental radiograph', 'xray', 1000.00, 'Diagnostics', 'camera', true),
('Denture Service', 'Partial or complete denture fitting', 'denture', 3000.00, 'Restorative', 'smile', true),
('Braces Consultation', 'Orthodontic consultation and treatment planning', 'braces', 5000.00, 'Orthodontics', 'grid', true),
('Dental Filling', 'Composite or amalgam dental filling', 'filling', 1200.00, 'Restorative', 'disc', true),
('Root Canal Treatment', 'Endodontic root canal therapy', 'root_canal', 4000.00, 'Restorative', 'activity', true)
ON CONFLICT DO NOTHING;

-- Step 3: Create IT monitoring tables
-- ===================================================================

-- IT Admin accounts
CREATE TABLE IF NOT EXISTS public.it_admin_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'it_admin' CHECK (role IN ('it_admin', 'developer', 'support')),
  permissions TEXT[] DEFAULT ARRAY['*'],
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System activity logging
CREATE TABLE IF NOT EXISTS public.it_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('admin', 'clinic', 'cardholder', 'system', 'it_admin')),
  actor_id UUID,
  actor_name VARCHAR(255),
  action_type VARCHAR(50) NOT NULL,
  action_category VARCHAR(30) NOT NULL CHECK (action_category IN (
    'authentication', 'card_management', 'clinic_management', 'appointment_booking',
    'perk_redemption', 'perk_management', 'system_admin', 'database_operation', 'api_request',
    'security_event', 'error_event', 'performance_event', 'user_interaction'
  )),
  target_type VARCHAR(30),
  target_id UUID,
  target_name VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_method VARCHAR(10),
  request_path TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  severity VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- System metrics
CREATE TABLE IF NOT EXISTS public.it_system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  metric_type VARCHAR(30) NOT NULL CHECK (metric_type IN (
    'cpu_usage', 'memory_usage', 'disk_usage', 'network_io', 'database_connections',
    'active_sessions', 'response_times', 'error_rates', 'throughput'
  )),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(20),
  metric_category VARCHAR(50),
  server_name VARCHAR(100),
  environment VARCHAR(20) DEFAULT 'production',
  additional_data JSONB,
  alert_threshold DECIMAL(15,4),
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Database performance monitoring
CREATE TABLE IF NOT EXISTS public.it_database_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  query_type VARCHAR(20) NOT NULL CHECK (query_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'OTHER')),
  table_name VARCHAR(100),
  query_hash VARCHAR(64),
  query_text TEXT,
  execution_time_ms DECIMAL(10,3) NOT NULL,
  rows_affected INTEGER,
  rows_returned INTEGER,
  cpu_time_ms DECIMAL(10,3),
  io_reads INTEGER,
  io_writes INTEGER,
  memory_usage_mb DECIMAL(10,3),
  connection_id VARCHAR(100),
  user_context JSONB,
  is_slow_query BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Security events
CREATE TABLE IF NOT EXISTS public.it_security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
    'login_attempt', 'login_success', 'login_failure', 'password_change',
    'permission_escalation', 'unauthorized_access', 'data_export', 'suspicious_activity',
    'account_lockout', 'session_timeout', 'privilege_violation'
  )),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  actor_type VARCHAR(20),
  actor_id UUID,
  actor_ip INET,
  actor_user_agent TEXT,
  target_resource VARCHAR(100),
  target_id UUID,
  action_attempted VARCHAR(255),
  success BOOLEAN,
  failure_reason TEXT,
  additional_context JSONB,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  requires_investigation BOOLEAN DEFAULT false,
  investigated_at TIMESTAMP,
  investigated_by UUID,
  investigation_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Error tracking
CREATE TABLE IF NOT EXISTS public.it_error_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  error_type VARCHAR(50) NOT NULL,
  error_code VARCHAR(20),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  request_id VARCHAR(100),
  session_id VARCHAR(100),
  user_context JSONB,
  request_context JSONB,
  environment VARCHAR(20) DEFAULT 'production',
  component VARCHAR(50),
  function_name VARCHAR(100),
  line_number INTEGER,
  file_path TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  resolution_notes TEXT,
  occurrence_count INTEGER DEFAULT 1,
  last_occurrence TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Feature usage analytics
CREATE TABLE IF NOT EXISTS public.it_feature_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  feature_name VARCHAR(100) NOT NULL,
  feature_category VARCHAR(50),
  user_type VARCHAR(20),
  user_id UUID,
  session_id VARCHAR(100),
  usage_duration_ms INTEGER,
  interaction_count INTEGER DEFAULT 1,
  success_rate DECIMAL(5,2),
  additional_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API endpoint monitoring
CREATE TABLE IF NOT EXISTS public.it_api_monitoring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  endpoint_path TEXT NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  user_agent TEXT,
  ip_address INET,
  user_context JSONB,
  rate_limit_remaining INTEGER,
  is_cached BOOLEAN DEFAULT false,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create indexes AFTER tables are created
-- ===================================================================

-- Perk management indexes
CREATE INDEX IF NOT EXISTS idx_perk_templates_category ON public.perk_templates(category);
CREATE INDEX IF NOT EXISTS idx_perk_templates_active ON public.perk_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_customizations_clinic ON public.clinic_perk_customizations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_customizations_enabled ON public.clinic_perk_customizations(is_enabled);
CREATE INDEX IF NOT EXISTS idx_perk_analytics_clinic_month ON public.perk_usage_analytics(clinic_id, month_year);

-- IT monitoring indexes
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_timestamp ON public.it_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_actor ON public.it_activity_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_action ON public.it_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_category ON public.it_activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_severity ON public.it_activity_logs(severity);

CREATE INDEX IF NOT EXISTS idx_it_system_metrics_timestamp ON public.it_system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_it_system_metrics_type ON public.it_system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_it_system_metrics_critical ON public.it_system_metrics(is_critical);

CREATE INDEX IF NOT EXISTS idx_it_db_performance_timestamp ON public.it_database_performance(timestamp);
CREATE INDEX IF NOT EXISTS idx_it_db_performance_table ON public.it_database_performance(table_name);
CREATE INDEX IF NOT EXISTS idx_it_db_performance_slow ON public.it_database_performance(is_slow_query);

CREATE INDEX IF NOT EXISTS idx_it_security_timestamp ON public.it_security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_it_security_type ON public.it_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_it_security_severity ON public.it_security_events(severity);
CREATE INDEX IF NOT EXISTS idx_it_security_investigation ON public.it_security_events(requires_investigation);

-- Error tracking indexes (NOW the table and column exist)
CREATE INDEX IF NOT EXISTS idx_it_error_timestamp ON public.it_error_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_it_error_type ON public.it_error_tracking(error_type);
CREATE INDEX IF NOT EXISTS idx_it_error_resolved ON public.it_error_tracking(is_resolved);

-- Step 5: Enable RLS
-- ===================================================================

-- Perk management RLS
ALTER TABLE public.perk_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_perk_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_usage_analytics ENABLE ROW LEVEL SECURITY;

-- IT monitoring RLS
ALTER TABLE public.it_admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_database_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_api_monitoring ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- ===================================================================

-- Perk management policies
CREATE POLICY "Allow all access to perk templates" ON public.perk_templates FOR ALL USING (true);
CREATE POLICY "Allow all access to perk categories" ON public.perk_categories FOR ALL USING (true);
CREATE POLICY "Allow all access to clinic customizations" ON public.clinic_perk_customizations FOR ALL USING (true);
CREATE POLICY "Allow all access to perk analytics" ON public.perk_usage_analytics FOR ALL USING (true);

-- IT monitoring policies
CREATE POLICY "Allow all access to IT admin accounts" ON public.it_admin_accounts FOR ALL USING (true);
CREATE POLICY "Allow all access to IT activity logs" ON public.it_activity_logs FOR ALL USING (true);
CREATE POLICY "Allow all access to IT system metrics" ON public.it_system_metrics FOR ALL USING (true);
CREATE POLICY "Allow all access to IT database performance" ON public.it_database_performance FOR ALL USING (true);
CREATE POLICY "Allow all access to IT security events" ON public.it_security_events FOR ALL USING (true);
CREATE POLICY "Allow all access to IT error tracking" ON public.it_error_tracking FOR ALL USING (true);
CREATE POLICY "Allow all access to IT feature usage" ON public.it_feature_usage FOR ALL USING (true);
CREATE POLICY "Allow all access to IT API monitoring" ON public.it_api_monitoring FOR ALL USING (true);

-- Step 7: Grant permissions
-- ===================================================================

-- Perk management permissions
GRANT ALL ON public.perk_templates TO anon, authenticated;
GRANT ALL ON public.perk_categories TO anon, authenticated;
GRANT ALL ON public.clinic_perk_customizations TO anon, authenticated;
GRANT ALL ON public.perk_usage_analytics TO anon, authenticated;

-- IT monitoring permissions
GRANT ALL ON public.it_admin_accounts TO anon, authenticated;
GRANT ALL ON public.it_activity_logs TO anon, authenticated;
GRANT ALL ON public.it_system_metrics TO anon, authenticated;
GRANT ALL ON public.it_database_performance TO anon, authenticated;
GRANT ALL ON public.it_security_events TO anon, authenticated;
GRANT ALL ON public.it_error_tracking TO anon, authenticated;
GRANT ALL ON public.it_feature_usage TO anon, authenticated;
GRANT ALL ON public.it_api_monitoring TO anon, authenticated;

-- Step 8: Create trigger functions
-- ===================================================================

-- Function to automatically populate clinic customizations when templates are created
CREATE OR REPLACE FUNCTION public.create_default_clinic_customizations()
RETURNS TRIGGER AS $$
DECLARE
    clinic_record RECORD;
BEGIN
    -- For each active clinic, create a default customization for the new perk template
    FOR clinic_record IN SELECT id FROM public.mocards_clinics WHERE status = 'active' LOOP
        INSERT INTO public.clinic_perk_customizations (
            clinic_id,
            perk_template_id,
            custom_name,
            custom_description,
            custom_value,
            is_enabled
        ) VALUES (
            clinic_record.id,
            NEW.id,
            NEW.name,
            NEW.description,
            NEW.default_value,
            NEW.is_active
        ) ON CONFLICT (clinic_id, perk_template_id) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to populate customizations for new clinics
CREATE OR REPLACE FUNCTION public.create_clinic_perk_customizations_for_new_clinic()
RETURNS TRIGGER AS $$
DECLARE
    template_record RECORD;
BEGIN
    -- For each active perk template, create a customization for the new clinic
    FOR template_record IN SELECT * FROM public.perk_templates WHERE is_active = true LOOP
        INSERT INTO public.clinic_perk_customizations (
            clinic_id,
            perk_template_id,
            custom_name,
            custom_description,
            custom_value,
            is_enabled
        ) VALUES (
            NEW.id,
            template_record.id,
            template_record.name,
            template_record.description,
            template_record.default_value,
            template_record.is_active
        ) ON CONFLICT (clinic_id, perk_template_id) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create triggers
-- ===================================================================

-- Trigger to auto-populate clinic customizations
CREATE OR REPLACE TRIGGER trigger_create_clinic_customizations
    AFTER INSERT ON public.perk_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_clinic_customizations();

-- Trigger for new clinics
CREATE OR REPLACE TRIGGER trigger_create_customizations_for_new_clinic
    AFTER INSERT ON public.mocards_clinics
    FOR EACH ROW
    EXECUTE FUNCTION public.create_clinic_perk_customizations_for_new_clinic();

-- Step 10: Update existing card_perks table (if it exists)
-- ===================================================================

-- Add new columns to existing card_perks table
DO $$
BEGIN
    -- Check if card_perks table exists before altering
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'card_perks') THEN
        -- Add columns if they don't exist
        ALTER TABLE public.card_perks
        ADD COLUMN IF NOT EXISTS perk_template_id UUID REFERENCES public.perk_templates(id),
        ADD COLUMN IF NOT EXISTS clinic_customization_id UUID REFERENCES public.clinic_perk_customizations(id),
        ADD COLUMN IF NOT EXISTS custom_value DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS redemption_notes TEXT,
        ADD COLUMN IF NOT EXISTS redeemed_value DECIMAL(10,2);

        -- Create index for the new column
        CREATE INDEX IF NOT EXISTS idx_card_perks_template ON public.card_perks(perk_template_id);
    END IF;
END $$;

-- ===================================================================
-- COMPLETION MESSAGE
-- ===================================================================

-- Log successful migration
INSERT INTO public.it_activity_logs (
    actor_type,
    action_type,
    action_category,
    target_type,
    target_name,
    details,
    severity
) VALUES (
    'system',
    'schema_migration',
    'system_admin',
    'database',
    'mocards_enhanced_schema',
    jsonb_build_object(
        'migration', 'enhanced_perk_management_and_it_monitoring',
        'timestamp', NOW(),
        'status', 'completed'
    ),
    'info'
);

/*
MIGRATION COMPLETED SUCCESSFULLY!

✅ Enhanced Perk Management System:
   - perk_templates (admin CRUD)
   - clinic_perk_customizations (clinic CRUD)
   - perk_categories (organization)
   - perk_usage_analytics (reporting)
   - Automatic mirroring triggers

✅ IT Monitoring & Audit System:
   - it_admin_accounts
   - it_activity_logs
   - it_system_metrics
   - it_database_performance
   - it_security_events
   - it_error_tracking
   - it_feature_usage
   - it_api_monitoring

✅ Integration Features:
   - Performance indexes
   - Row Level Security
   - Automatic triggers
   - Proper permissions

Next steps:
1. Test admin perk management UI
2. Test clinic perk customization UI
3. Verify automatic mirroring works
4. Test IT monitoring features
*/