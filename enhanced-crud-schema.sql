-- ===================================================================
-- ENHANCED CRUD SCHEMA FOR MOCARDS PLATFORM
-- Full customization and CRUD operations
-- ===================================================================

-- System configuration table for customizable settings
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT,
  config_type VARCHAR(50) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Text labels and customization table
CREATE TABLE IF NOT EXISTS public.text_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label_key VARCHAR(100) NOT NULL UNIQUE,
  label_value TEXT NOT NULL,
  label_category VARCHAR(50) DEFAULT 'general',
  description TEXT,
  is_customizable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Code format templates table
CREATE TABLE IF NOT EXISTS public.code_formats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  format_name VARCHAR(100) NOT NULL UNIQUE,
  format_type VARCHAR(50) NOT NULL CHECK (format_type IN ('control_number', 'passcode', 'batch_number', 'clinic_code')),
  format_template TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default system configurations
INSERT INTO public.system_config (config_key, config_value, config_type, description, category) VALUES
('app_name', 'MOCARDS', 'string', 'Application name displayed in headers', 'branding'),
('app_subtitle', 'Medical Cards Management System', 'string', 'Application subtitle', 'branding'),
('default_cards_per_batch', '500', 'number', 'Default number of cards per batch', 'generation'),
('max_cards_per_batch', '10000', 'number', 'Maximum cards allowed per batch', 'generation'),
('card_expiry_months', '12', 'number', 'Default card expiry in months', 'generation'),
('enable_bulk_operations', 'true', 'boolean', 'Enable bulk operations', 'features'),
('location_code_length', '3', 'number', 'Length of location codes', 'formatting'),
('require_clinic_approval', 'false', 'boolean', 'Require admin approval for new clinics', 'workflow')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default text labels
INSERT INTO public.text_labels (label_key, label_value, label_category, description) VALUES
-- Navigation Labels
('nav_overview', 'Overview', 'navigation', 'Overview tab label'),
('nav_generate', 'Generate Cards', 'navigation', 'Generate cards tab label'),
('nav_clinics', 'Manage Clinics', 'navigation', 'Clinics management tab label'),
('nav_assign', 'Assign Cards', 'navigation', 'Card assignment tab label'),
('nav_locations', 'Manage Locations', 'navigation', 'Location management tab label'),
('nav_settings', 'System Settings', 'navigation', 'Settings tab label'),

-- Form Labels
('form_clinic_name', 'Clinic Name', 'forms', 'Clinic name field label'),
('form_clinic_code', 'Clinic Code', 'forms', 'Clinic code field label'),
('form_contact_person', 'Contact Person', 'forms', 'Contact person field label'),
('form_email', 'Email Address', 'forms', 'Email field label'),
('form_phone', 'Phone Number', 'forms', 'Phone field label'),
('form_address', 'Address', 'forms', 'Address field label'),
('form_city', 'City', 'forms', 'City field label'),
('form_province', 'Province/State', 'forms', 'Province field label'),
('form_location_code', 'Location Code', 'forms', 'Location code field label'),
('form_location_name', 'Location Name', 'forms', 'Location name field label'),
('form_batch_number', 'Batch Number', 'forms', 'Batch number field label'),
('form_total_cards', 'Number of Cards', 'forms', 'Total cards field label'),
('form_notes', 'Notes', 'forms', 'Notes field label'),

-- Button Labels
('btn_create', 'Create', 'buttons', 'Create button label'),
('btn_update', 'Update', 'buttons', 'Update button label'),
('btn_delete', 'Delete', 'buttons', 'Delete button label'),
('btn_save', 'Save', 'buttons', 'Save button label'),
('btn_cancel', 'Cancel', 'buttons', 'Cancel button label'),
('btn_generate', 'Generate', 'buttons', 'Generate button label'),
('btn_assign', 'Assign', 'buttons', 'Assign button label'),
('btn_activate', 'Activate', 'buttons', 'Activate button label'),
('btn_export', 'Export', 'buttons', 'Export button label'),
('btn_import', 'Import', 'buttons', 'Import button label'),

-- Status Labels
('status_active', 'Active', 'status', 'Active status label'),
('status_inactive', 'Inactive', 'status', 'Inactive status label'),
('status_suspended', 'Suspended', 'status', 'Suspended status label'),
('status_unassigned', 'Unassigned', 'status', 'Unassigned card status'),
('status_assigned', 'Assigned', 'status', 'Assigned card status'),
('status_activated', 'Activated', 'status', 'Activated card status'),
('status_expired', 'Expired', 'status', 'Expired card status'),

-- Messages
('msg_success_create', 'Successfully created', 'messages', 'Success creation message'),
('msg_success_update', 'Successfully updated', 'messages', 'Success update message'),
('msg_success_delete', 'Successfully deleted', 'messages', 'Success deletion message'),
('msg_confirm_delete', 'Are you sure you want to delete this item?', 'messages', 'Delete confirmation message'),
('msg_no_data', 'No data available', 'messages', 'No data message'),
('msg_loading', 'Loading...', 'messages', 'Loading message'),

-- Headers
('header_dashboard', 'Admin Dashboard', 'headers', 'Main dashboard header'),
('header_card_generation', 'Card Generation', 'headers', 'Card generation header'),
('header_clinic_management', 'Clinic Management', 'headers', 'Clinic management header'),
('header_location_management', 'Location Management', 'headers', 'Location management header'),
('header_system_settings', 'System Settings', 'headers', 'System settings header'),

-- Descriptions
('desc_overview', 'Dashboard statistics and overview', 'descriptions', 'Overview tab description'),
('desc_generate', 'Create new card batches', 'descriptions', 'Generate tab description'),
('desc_clinics', 'Manage clinic information', 'descriptions', 'Clinics tab description'),
('desc_assign', 'Assign cards to clinics', 'descriptions', 'Assign tab description'),
('desc_locations', 'Manage location codes', 'descriptions', 'Locations tab description'),
('desc_settings', 'Customize system settings', 'descriptions', 'Settings tab description')

ON CONFLICT (label_key) DO NOTHING;

-- Insert default code formats
INSERT INTO public.code_formats (format_name, format_type, format_template, description, is_default) VALUES
('Default Control Number', 'control_number', '{location_prefix}-{batch_prefix}-{sequence:4}', 'Default format: PHL-BATCH-0001', true),
('Default Passcode', 'passcode', '{location_code}-{random:4}', 'Default format: 001-1234', true),
('Default Batch Number', 'batch_number', 'BATCH-{sequence:3}', 'Default format: BATCH-001', true),
('Default Clinic Code', 'clinic_code', '{clinic_name_abbr}{sequence:3}', 'Default format: ABC001', true),
('Alternative Control Number', 'control_number', '{location_prefix}{batch_prefix}{sequence:6}', 'Alternative format: PHLBATCH000001', false),
('Alternative Passcode', 'passcode', '{location_code}{random:6}', 'Alternative format: 001123456', false),
('Short Batch Number', 'batch_number', 'B{sequence:2}', 'Short format: B01', false)
ON CONFLICT (format_name) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON public.system_config FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.text_labels FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.code_formats FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.system_config TO anon, authenticated;
GRANT ALL ON public.text_labels TO anon, authenticated;
GRANT ALL ON public.code_formats TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_text_labels_key ON public.text_labels(label_key);
CREATE INDEX IF NOT EXISTS idx_text_labels_category ON public.text_labels(label_category);
CREATE INDEX IF NOT EXISTS idx_code_formats_type ON public.code_formats(format_type);
CREATE INDEX IF NOT EXISTS idx_code_formats_active ON public.code_formats(is_active);