-- ===================================================================
-- MOCARDS IT MONITORING & AUDIT SCHEMA
-- Comprehensive logging and monitoring for developer troubleshooting
-- ===================================================================

-- IT Admin accounts with highest privileges
CREATE TABLE IF NOT EXISTS public.it_admin_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'it_admin' CHECK (role IN ('it_admin', 'developer', 'support')),
  permissions TEXT[] DEFAULT ARRAY['*'], -- All permissions
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comprehensive system activity logging
CREATE TABLE IF NOT EXISTS public.it_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('admin', 'clinic', 'cardholder', 'system', 'it_admin')),
  actor_id UUID,
  actor_name VARCHAR(255),
  action_type VARCHAR(50) NOT NULL,
  action_category VARCHAR(30) NOT NULL CHECK (action_category IN (
    'authentication', 'card_management', 'clinic_management', 'appointment_booking',
    'perk_redemption', 'system_admin', 'database_operation', 'api_request',
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

-- Real-time performance monitoring
CREATE TABLE IF NOT EXISTS public.it_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  metric_name VARCHAR(50) NOT NULL,
  metric_category VARCHAR(30) NOT NULL CHECK (metric_category IN (
    'database', 'api_response', 'user_interaction', 'system_resource',
    'card_operation', 'clinic_operation', 'appointment_operation'
  )),
  metric_value DECIMAL(12,4),
  metric_unit VARCHAR(20),
  context JSONB,
  severity VARCHAR(10) DEFAULT 'info',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Database query performance tracking
CREATE TABLE IF NOT EXISTS public.it_query_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  query_type VARCHAR(30) NOT NULL,
  table_name VARCHAR(50),
  operation VARCHAR(20) CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  duration_ms INTEGER,
  rows_affected INTEGER,
  query_hash VARCHAR(64),
  query_text TEXT,
  execution_plan JSONB,
  index_usage JSONB,
  cache_hit_ratio DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Error tracking and debugging
CREATE TABLE IF NOT EXISTS public.it_error_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  error_type VARCHAR(50) NOT NULL,
  error_code VARCHAR(20),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_context JSONB,
  system_context JSONB,
  resolution_status VARCHAR(20) DEFAULT 'new' CHECK (resolution_status IN ('new', 'investigating', 'resolved', 'ignored')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.it_admin_accounts(id),
  resolved_at TIMESTAMP,
  severity VARCHAR(10) DEFAULT 'error',
  frequency_count INTEGER DEFAULT 1,
  first_occurrence TIMESTAMP DEFAULT NOW(),
  last_occurrence TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User session tracking
CREATE TABLE IF NOT EXISTS public.it_session_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  user_id UUID,
  user_identifier VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(20),
  browser_name VARCHAR(50),
  location_data JSONB,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  session_duration_minutes INTEGER,
  pages_visited INTEGER DEFAULT 0,
  actions_performed INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  ended_reason VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS public.it_system_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  component VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'down')),
  cpu_usage_percent DECIMAL(5,2),
  memory_usage_percent DECIMAL(5,2),
  disk_usage_percent DECIMAL(5,2),
  active_connections INTEGER,
  response_time_ms INTEGER,
  throughput_per_minute INTEGER,
  error_rate_percent DECIMAL(5,2),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Real-time dashboard metrics
CREATE TABLE IF NOT EXISTS public.it_dashboard_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  total_active_users INTEGER DEFAULT 0,
  total_cards_generated_today INTEGER DEFAULT 0,
  total_cards_activated_today INTEGER DEFAULT 0,
  total_appointments_today INTEGER DEFAULT 0,
  total_perks_redeemed_today INTEGER DEFAULT 0,
  average_response_time_ms DECIMAL(8,2),
  error_rate_percent DECIMAL(5,2),
  database_connections INTEGER,
  active_admin_sessions INTEGER,
  active_clinic_sessions INTEGER,
  system_load_average DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_timestamp ON public.it_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_actor ON public.it_activity_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_action ON public.it_activity_logs(action_type, action_category);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_severity ON public.it_activity_logs(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_it_activity_logs_session ON public.it_activity_logs(session_id);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_it_performance_metrics_timestamp ON public.it_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_it_performance_metrics_category ON public.it_performance_metrics(metric_category, metric_name);

-- Error tracking indexes
CREATE INDEX IF NOT EXISTS idx_it_error_tracking_timestamp ON public.it_error_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_it_error_tracking_type ON public.it_error_tracking(error_type, severity);
CREATE INDEX IF NOT EXISTS idx_it_error_tracking_status ON public.it_error_tracking(resolution_status);

-- Session tracking indexes
CREATE INDEX IF NOT EXISTS idx_it_session_tracking_user ON public.it_session_tracking(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_it_session_tracking_active ON public.it_session_tracking(session_start DESC) WHERE session_end IS NULL;

-- ===================================================================
-- IT MONITORING FUNCTIONS
-- ===================================================================

-- Function to log activity automatically
CREATE OR REPLACE FUNCTION log_it_activity(
  p_actor_type VARCHAR(20),
  p_actor_id UUID DEFAULT NULL,
  p_actor_name VARCHAR(255) DEFAULT NULL,
  p_action_type VARCHAR(50),
  p_action_category VARCHAR(30),
  p_target_type VARCHAR(30) DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_name VARCHAR(255) DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id VARCHAR(255) DEFAULT NULL,
  p_severity VARCHAR(10) DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.it_activity_logs (
    actor_type, actor_id, actor_name, action_type, action_category,
    target_type, target_id, target_name, details, ip_address,
    user_agent, session_id, severity
  ) VALUES (
    p_actor_type, p_actor_id, p_actor_name, p_action_type, p_action_category,
    p_target_type, p_target_id, p_target_name, p_details, p_ip_address,
    p_user_agent, p_session_id, p_severity
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metric(
  p_metric_name VARCHAR(50),
  p_metric_category VARCHAR(30),
  p_metric_value DECIMAL(12,4),
  p_metric_unit VARCHAR(20) DEFAULT NULL,
  p_context JSONB DEFAULT NULL,
  p_severity VARCHAR(10) DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO public.it_performance_metrics (
    metric_name, metric_category, metric_value, metric_unit, context, severity
  ) VALUES (
    p_metric_name, p_metric_category, p_metric_value, p_metric_unit, p_context, p_severity
  ) RETURNING id INTO metric_id;

  RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time dashboard data
CREATE OR REPLACE FUNCTION get_it_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'timestamp', NOW(),
    'active_users', (
      SELECT COUNT(DISTINCT session_id)
      FROM it_session_tracking
      WHERE session_end IS NULL AND last_activity > NOW() - INTERVAL '30 minutes'
    ),
    'cards_generated_today', (
      SELECT COUNT(*) FROM cards WHERE DATE(created_at) = CURRENT_DATE
    ),
    'cards_activated_today', (
      SELECT COUNT(*) FROM cards WHERE DATE(activated_at) = CURRENT_DATE
    ),
    'appointments_today', (
      SELECT COUNT(*) FROM appointments WHERE DATE(created_at) = CURRENT_DATE
    ),
    'recent_errors', (
      SELECT COUNT(*) FROM it_error_tracking
      WHERE timestamp > NOW() - INTERVAL '1 hour' AND severity IN ('error', 'critical')
    ),
    'average_response_time', (
      SELECT AVG(response_time_ms) FROM it_activity_logs
      WHERE timestamp > NOW() - INTERVAL '1 hour' AND response_time_ms IS NOT NULL
    ),
    'database_size_mb', pg_database_size(current_database()) / 1024 / 1024,
    'total_clinics', (SELECT COUNT(*) FROM mocards_clinics WHERE is_active = true),
    'total_cards', (SELECT COUNT(*) FROM cards),
    'system_health', 'healthy'
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent activity feed
CREATE OR REPLACE FUNCTION get_recent_activity_feed(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  timestamp TIMESTAMP,
  actor_display VARCHAR(255),
  action_summary TEXT,
  severity VARCHAR(10),
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.timestamp,
    COALESCE(al.actor_name, al.actor_type || ' #' || SUBSTRING(al.actor_id::text, 1, 8)) as actor_display,
    al.action_type || ' on ' || COALESCE(al.target_name, al.target_type) as action_summary,
    al.severity,
    al.details
  FROM it_activity_logs al
  ORDER BY al.timestamp DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- TRIGGERS FOR AUTOMATIC LOGGING
-- ===================================================================

-- Trigger function for card operations
CREATE OR REPLACE FUNCTION trigger_log_card_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_it_activity(
      'system', NULL, 'System', 'card_created', 'card_management',
      'card', NEW.id, NEW.control_number,
      json_build_object('status', NEW.status, 'location', NEW.location_code),
      NULL, NULL, NULL, 'info'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      PERFORM log_it_activity(
        'system', NULL, 'System', 'card_status_changed', 'card_management',
        'card', NEW.id, NEW.control_number,
        json_build_object('old_status', OLD.status, 'new_status', NEW.status),
        NULL, NULL, NULL, 'info'
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS tr_card_activity_log ON public.cards;
CREATE TRIGGER tr_card_activity_log
  AFTER INSERT OR UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION trigger_log_card_activity();

-- ===================================================================
-- INITIAL IT ADMIN SETUP
-- ===================================================================

-- Create initial IT admin account
INSERT INTO public.it_admin_accounts (
  username,
  email,
  password_hash,
  full_name,
  role,
  permissions
) VALUES (
  'itadmin',
  'dev@mocards.system',
  '$2a$12$LQv3c1yqBwEHxrVrz.pZQOsQJF5K5J5J5J5J5J5J5J5J5J5J5J5J5', -- Password: 'ITAccess2024!'
  'MOCARDS IT Administrator',
  'it_admin',
  ARRAY['*']
) ON CONFLICT (username) DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Create view for IT dashboard
CREATE OR REPLACE VIEW it_live_dashboard AS
SELECT
  'system_overview' as section,
  json_build_object(
    'timestamp', NOW(),
    'total_users_online', (
      SELECT COUNT(DISTINCT session_id) FROM it_session_tracking
      WHERE session_end IS NULL AND last_activity > NOW() - INTERVAL '15 minutes'
    ),
    'cards_generated_today', (
      SELECT COUNT(*) FROM cards WHERE DATE(created_at) = CURRENT_DATE
    ),
    'active_clinic_sessions', (
      SELECT COUNT(*) FROM it_session_tracking
      WHERE user_type = 'clinic' AND session_end IS NULL
    ),
    'errors_last_hour', (
      SELECT COUNT(*) FROM it_error_tracking
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    ),
    'database_connections', (
      SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'
    )
  ) as metrics;

SELECT 'IT Monitoring schema created successfully!' as status;