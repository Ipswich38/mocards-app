-- =============================================================================
-- CLINIC CARD LOOKUP SCHEMA FIX
-- =============================================================================
-- This schema ensures that all tables have the correct fields for clinic card lookup functionality
-- Fixes missing columns in default_perk_templates table

-- Ensure default_perk_templates table has all required columns
ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT true;

ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS customizable BOOLEAN DEFAULT false;

ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS max_redemptions INTEGER;

ALTER TABLE public.default_perk_templates
ADD COLUMN IF NOT EXISTS valid_for_days INTEGER;

-- Insert default perk templates if they don't exist
INSERT INTO public.default_perk_templates (perk_name, perk_type, perk_value, description, is_active, is_default)
SELECT * FROM (VALUES
  ('Dental Consultation', 'consultation', 500.00, 'Free dental consultation and checkup', true, true),
  ('Dental Cleaning', 'cleaning', 800.00, 'Professional dental cleaning service', true, true),
  ('Tooth Extraction', 'extraction', 1500.00, 'Tooth extraction service', true, true),
  ('Fluoride Treatment', 'fluoride', 300.00, 'Fluoride treatment for cavity prevention', true, true),
  ('Teeth Whitening', 'whitening', 2500.00, 'Professional teeth whitening service', true, true),
  ('Dental X-Ray', 'xray', 1000.00, 'Dental X-ray imaging', true, true),
  ('Denture Service', 'denture', 3000.00, 'Denture fitting and service', true, true),
  ('Braces Discount', 'braces', 5000.00, 'Discount on braces treatment', true, true)
) AS v(perk_name, perk_type, perk_value, description, is_active, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_perk_templates
  WHERE perk_type = v.perk_type AND is_default = true
);

-- Ensure cards table has proper indexes for clinic lookups
CREATE INDEX IF NOT EXISTS idx_cards_assigned_clinic_id ON public.cards(assigned_clinic_id);
CREATE INDEX IF NOT EXISTS idx_cards_control_number_v2 ON public.cards(control_number_v2);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_search_lookup ON public.cards(control_number, control_number_v2, status);

-- Ensure card_perks table has proper columns for perk management
ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS perk_template_id UUID REFERENCES public.default_perk_templates(id);

ALTER TABLE public.card_perks
ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;

-- Create index for faster perk lookups
CREATE INDEX IF NOT EXISTS idx_card_perks_card_id ON public.card_perks(card_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_claimed ON public.card_perks(claimed);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify the schema is correct:

-- 1. Check default_perk_templates structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'default_perk_templates' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- 2. Check if default perks exist
-- SELECT perk_name, perk_type, perk_value, is_default
-- FROM public.default_perk_templates
-- WHERE is_active = true AND is_default = true;

-- 3. Check cards table indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'cards' AND schemaname = 'public';