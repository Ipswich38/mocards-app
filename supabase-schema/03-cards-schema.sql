-- CARDS MODULE SCHEMA
-- Secure card management with tenant isolation

-- Card categories and types
CREATE TABLE cards.card_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color_scheme JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards table with comprehensive tracking
CREATE TABLE cards.cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    control_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    clinic_id UUID REFERENCES clinics.clinics(id),
    category_id UUID REFERENCES cards.card_categories(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
    perks_total INTEGER DEFAULT 10,
    perks_used INTEGER DEFAULT 0,
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    qr_code_data TEXT,
    tenant_id UUID, -- Inherited from clinic for isolation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Card history for tracking changes
CREATE TABLE cards.card_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    card_id UUID REFERENCES cards.cards(id) ON DELETE CASCADE,
    control_number TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'activated', 'deactivated', 'expired', 'transferred')),
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES auth_mgmt.user_profiles(id),
    clinic_id UUID REFERENCES clinics.clinics(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card exports for batch operations
CREATE TABLE cards.card_exports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics.clinics(id),
    export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'xlsx', 'pdf', 'json')),
    filter_criteria JSONB DEFAULT '{}'::jsonb,
    total_records INTEGER,
    file_path TEXT,
    file_size BIGINT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_by UUID REFERENCES auth_mgmt.user_profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card validations for security
CREATE TABLE cards.card_validations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    card_id UUID REFERENCES cards.cards(id) ON DELETE CASCADE,
    validation_type TEXT NOT NULL CHECK (validation_type IN ('lookup', 'qr_scan', 'manual_verify')),
    validated_by UUID REFERENCES auth_mgmt.user_profiles(id),
    clinic_id UUID REFERENCES clinics.clinics(id),
    ip_address INET,
    user_agent TEXT,
    is_valid BOOLEAN NOT NULL,
    validation_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cards.card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards.card_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards.card_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards.card_validations ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Card categories: Everyone can read active categories
CREATE POLICY "card_categories_read_active" ON cards.card_categories
    FOR SELECT USING (is_active = true);

-- Cards: Multi-tenant isolation - users can only see cards from their clinic
CREATE POLICY "cards_clinic_isolation" ON cards.cards
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Cards can be updated by clinic staff or admins
CREATE POLICY "cards_clinic_update" ON cards.cards
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    )
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Card history: Same isolation as cards
CREATE POLICY "card_history_clinic_isolation" ON cards.card_history
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Card exports: Clinic isolation
CREATE POLICY "card_exports_clinic_isolation" ON cards.card_exports
    FOR ALL USING (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Card validations: Clinic isolation
CREATE POLICY "card_validations_clinic_isolation" ON cards.card_validations
    FOR ALL USING (
        clinic_id IN (
            SELECT clinic_id FROM auth_mgmt.user_profiles WHERE id = auth.uid()
            UNION
            SELECT clinic_id FROM clinics.clinic_staff WHERE user_id = auth.uid() AND is_active = true
        ) OR
        auth.uid() IN (SELECT id FROM auth_mgmt.user_profiles WHERE role IN ('super_admin', 'admin'))
    );

-- Add audit triggers
CREATE TRIGGER audit_cards
    AFTER INSERT OR UPDATE OR DELETE ON cards.cards
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

CREATE TRIGGER audit_card_exports
    AFTER INSERT OR UPDATE OR DELETE ON cards.card_exports
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

-- Indexes for performance
CREATE INDEX idx_cards_control_number ON cards.cards(control_number);
CREATE INDEX idx_cards_clinic_id ON cards.cards(clinic_id);
CREATE INDEX idx_cards_status ON cards.cards(status);
CREATE INDEX idx_cards_tenant_id ON cards.cards(tenant_id);
CREATE INDEX idx_cards_expiry_date ON cards.cards(expiry_date);
CREATE INDEX idx_card_history_card_id ON cards.card_history(card_id);
CREATE INDEX idx_card_history_clinic_id ON cards.card_history(clinic_id);
CREATE INDEX idx_card_exports_clinic_id ON cards.card_exports(clinic_id);
CREATE INDEX idx_card_validations_card_id ON cards.card_validations(card_id);
CREATE INDEX idx_card_validations_clinic_id ON cards.card_validations(clinic_id);