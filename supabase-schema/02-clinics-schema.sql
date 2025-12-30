-- CLINICS MODULE SCHEMA
-- Cloud-isolated clinic management with enterprise security

-- Clinic plans and pricing
CREATE TABLE clinics.clinic_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    max_cards INTEGER NOT NULL,
    max_clinics INTEGER NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinics table with enhanced security
CREATE TABLE clinics.clinics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- Clinic access code
    email TEXT UNIQUE NOT NULL,
    contact_number TEXT NOT NULL,
    address TEXT NOT NULL,
    region TEXT NOT NULL,
    plan_id UUID REFERENCES clinics.clinic_plans(id),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    subscription_expires TIMESTAMP WITH TIME ZONE,
    tenant_id UUID DEFAULT uuid_generate_v4(), -- For multi-tenant isolation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Clinic settings for customization
CREATE TABLE clinics.clinic_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics.clinics(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(clinic_id, setting_key)
);

-- Clinic staff management
CREATE TABLE clinics.clinic_staff (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth_mgmt.user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'viewer')),
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    hired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(clinic_id, user_id)
);

-- Enable RLS
ALTER TABLE clinics.clinic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics.clinic_staff ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Clinic plans: Everyone can read active plans
CREATE POLICY "clinic_plans_read_active" ON clinics.clinic_plans
    FOR SELECT USING (is_active = true);

-- Only super admins can manage plans
CREATE POLICY "clinic_plans_admin_only" ON clinics.clinic_plans
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role = 'super_admin')
    );

-- Clinics: Clinic users can only see their own clinic, admins can see all
CREATE POLICY "clinics_own_data" ON clinics.clinics
    FOR SELECT USING (
        id IN (SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Clinics can update their own data
CREATE POLICY "clinics_update_own" ON clinics.clinics
    FOR UPDATE USING (
        id IN (SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        id IN (SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid())
    );

-- Clinic settings: Clinic staff can manage their clinic's settings
CREATE POLICY "clinic_settings_clinic_access" ON clinics.clinic_settings
    FOR ALL USING (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Clinic staff: Staff can see colleagues, admins can see all
CREATE POLICY "clinic_staff_clinic_access" ON clinics.clinic_staff
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Add audit triggers
CREATE TRIGGER audit_clinic_plans
    AFTER INSERT OR UPDATE OR DELETE ON clinics.clinic_plans
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

CREATE TRIGGER audit_clinics
    AFTER INSERT OR UPDATE OR DELETE ON clinics.clinics
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

CREATE TRIGGER audit_clinic_settings
    AFTER INSERT OR UPDATE OR DELETE ON clinics.clinic_settings
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

CREATE TRIGGER audit_clinic_staff
    AFTER INSERT OR UPDATE OR DELETE ON clinics.clinic_staff
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

-- Indexes for performance
CREATE INDEX idx_clinics_code ON clinics.clinics(code);
CREATE INDEX idx_clinics_email ON clinics.clinics(email);
CREATE INDEX idx_clinics_plan_id ON clinics.clinics(plan_id);
CREATE INDEX idx_clinics_tenant_id ON clinics.clinics(tenant_id);
CREATE INDEX idx_clinic_settings_clinic_id ON clinics.clinic_settings(clinic_id);
CREATE INDEX idx_clinic_settings_key ON clinics.clinic_settings(clinic_id, setting_key);
CREATE INDEX idx_clinic_staff_clinic_id ON clinics.clinic_staff(clinic_id);
CREATE INDEX idx_clinic_staff_user_id ON clinics.clinic_staff(user_id);