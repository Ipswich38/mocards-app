-- AUTHENTICATION MODULE SCHEMA
-- Enterprise-grade authentication with cloud isolation

-- User profiles table with advanced security
CREATE TABLE auth_mgmt.user_profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'clinic', 'user')),
    clinic_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE auth_mgmt.user_profiles ENABLE ROW LEVEL SECURITY;

-- User sessions for advanced session management
CREATE TABLE auth_mgmt.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth_mgmt.user_profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auth_mgmt.user_sessions ENABLE ROW LEVEL SECURITY;

-- Security events for monitoring
CREATE TABLE auth_mgmt.security_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth_mgmt.user_profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login', 'password_change', 'account_locked', 'suspicious_activity')),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auth_mgmt.security_events ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- User profiles: Users can only see their own profile, admins can see clinic users
CREATE POLICY "user_profiles_own_data" ON auth_mgmt.user_profiles
    FOR SELECT USING (
        auth.uid() = id OR
        (auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin')))
    );

CREATE POLICY "user_profiles_update_own" ON auth_mgmt.user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin can insert/update clinic users
CREATE POLICY "user_profiles_admin_manage" ON auth_mgmt.user_profiles
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- User sessions: Users can only see their own sessions
CREATE POLICY "user_sessions_own_data" ON auth_mgmt.user_sessions
    FOR ALL USING (user_id = auth.uid());

-- Security events: Users can see their own, admins can see all
CREATE POLICY "security_events_view" ON auth_mgmt.security_events
    FOR SELECT USING (
        user_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Add audit triggers
SELECT audit.audit_trigger() FROM (
    SELECT audit.audit_trigger() AS result
    WHERE pg_trigger_depth() = 0
) AS subquery;

CREATE TRIGGER audit_user_profiles
    AFTER INSERT OR UPDATE OR DELETE ON auth_mgmt.user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

CREATE TRIGGER audit_user_sessions
    AFTER INSERT OR UPDATE OR DELETE ON auth_mgmt.user_sessions
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

-- Indexes for performance
CREATE INDEX idx_user_profiles_email ON auth_mgmt.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON auth_mgmt.user_profiles(role);
CREATE INDEX idx_user_profiles_clinic_id ON auth_mgmt.user_profiles(clinic_id);
CREATE INDEX idx_user_sessions_user_id ON auth_mgmt.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON auth_mgmt.user_sessions(session_token);
CREATE INDEX idx_security_events_user_id ON auth_mgmt.security_events(user_id);
CREATE INDEX idx_security_events_type ON auth_mgmt.security_events(event_type);