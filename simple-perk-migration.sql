-- ===================================================================
-- SIMPLE PERK MANAGEMENT MIGRATION
-- Core perk system without complex triggers to avoid SQL issues
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
  clinic_id UUID,
  perk_template_id UUID,
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
  perk_template_id UUID,
  clinic_id UUID,
  card_id UUID,
  redemption_date DATE NOT NULL,
  redemption_value DECIMAL(10,2),
  month_year VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_perk_templates_category ON public.perk_templates(category);
CREATE INDEX IF NOT EXISTS idx_perk_templates_active ON public.perk_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_customizations_clinic ON public.clinic_perk_customizations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_customizations_enabled ON public.clinic_perk_customizations(is_enabled);
CREATE INDEX IF NOT EXISTS idx_perk_analytics_clinic_month ON public.perk_usage_analytics(clinic_id, month_year);

-- Enable RLS
ALTER TABLE public.perk_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_perk_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all access to perk templates" ON public.perk_templates FOR ALL USING (true);
CREATE POLICY "Allow all access to perk categories" ON public.perk_categories FOR ALL USING (true);
CREATE POLICY "Allow all access to clinic customizations" ON public.clinic_perk_customizations FOR ALL USING (true);
CREATE POLICY "Allow all access to perk analytics" ON public.perk_usage_analytics FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.perk_templates TO anon, authenticated;
GRANT ALL ON public.perk_categories TO anon, authenticated;
GRANT ALL ON public.clinic_perk_customizations TO anon, authenticated;
GRANT ALL ON public.perk_usage_analytics TO anon, authenticated;