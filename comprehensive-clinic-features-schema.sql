-- ===================================================================
-- COMPREHENSIVE CLINIC FEATURES SCHEMA FOR MOCARDS PLATFORM
-- Appointments, Messaging, and E-Signature Support
-- ===================================================================

-- Appointment management table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(50) NOT NULL,
  patient_email VARCHAR(255),
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(50) NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),
  requested_by VARCHAR(50) DEFAULT 'admin' CHECK (requested_by IN ('admin', 'patient', 'clinic')),
  clinic_notified BOOLEAN DEFAULT true,
  clinic_response TEXT,
  responded_by VARCHAR(255),
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clinic messaging system
CREATE TABLE IF NOT EXISTS public.clinic_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'general' CHECK (message_type IN ('inquiry', 'request', 'issue', 'general')),
  status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded')),
  sent_by VARCHAR(255) NOT NULL, -- clinic staff name
  admin_response TEXT,
  admin_responded_by VARCHAR(255),
  admin_responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Card activation logs with e-signature
CREATE TABLE IF NOT EXISTS public.card_activation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  activated_by_name VARCHAR(255) NOT NULL,
  activated_by_signature TEXT NOT NULL,
  activation_timestamp TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Perk redemption logs with e-signature
CREATE TABLE IF NOT EXISTS public.perk_redemption_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  perk_id UUID REFERENCES public.perks(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  redeemed_by_name VARCHAR(255) NOT NULL,
  redeemed_by_signature TEXT NOT NULL,
  redemption_value DECIMAL(10,2) NOT NULL,
  redemption_timestamp TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced clinic profiles (if not exists)
-- Adding password change functionality
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

CREATE INDEX IF NOT EXISTS idx_clinic_messages_clinic_id ON public.clinic_messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_messages_status ON public.clinic_messages(status);
CREATE INDEX IF NOT EXISTS idx_clinic_messages_type ON public.clinic_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_card_activation_logs_card_id ON public.card_activation_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_card_activation_logs_clinic_id ON public.card_activation_logs(clinic_id);

CREATE INDEX IF NOT EXISTS idx_perk_redemption_logs_card_id ON public.perk_redemption_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemption_logs_perk_id ON public.perk_redemption_logs(perk_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemption_logs_clinic_id ON public.perk_redemption_logs(clinic_id);

-- Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_activation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_redemption_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Clinics can view their appointments" ON public.appointments
  FOR SELECT USING (clinic_id IN (SELECT id FROM public.clinics));

CREATE POLICY "Admins can view all appointments" ON public.appointments
  FOR SELECT USING (true);

CREATE POLICY "Allow appointment creation" ON public.appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Clinics can update their appointment responses" ON public.appointments
  FOR UPDATE USING (clinic_id IN (SELECT id FROM public.clinics));

-- RLS Policies for clinic messages
CREATE POLICY "Clinics can view their messages" ON public.clinic_messages
  FOR SELECT USING (clinic_id IN (SELECT id FROM public.clinics));

CREATE POLICY "Clinics can create messages" ON public.clinic_messages
  FOR INSERT WITH CHECK (clinic_id IN (SELECT id FROM public.clinics));

CREATE POLICY "Admins can view all messages" ON public.clinic_messages
  FOR SELECT USING (true);

CREATE POLICY "Admins can respond to messages" ON public.clinic_messages
  FOR UPDATE USING (true);

-- RLS Policies for activation logs
CREATE POLICY "Clinics can view their activation logs" ON public.card_activation_logs
  FOR SELECT USING (clinic_id IN (SELECT id FROM public.clinics));

CREATE POLICY "Clinics can create activation logs" ON public.card_activation_logs
  FOR INSERT WITH CHECK (clinic_id IN (SELECT id FROM public.clinics));

CREATE POLICY "Admins can view all activation logs" ON public.card_activation_logs
  FOR SELECT USING (true);

-- RLS Policies for redemption logs
CREATE POLICY "Clinics can view their redemption logs" ON public.perk_redemption_logs
  FOR SELECT USING (clinic_id IN (SELECT id FROM public.clinics));

CREATE POLICY "Clinics can create redemption logs" ON public.perk_redemption_logs
  FOR INSERT WITH CHECK (clinic_id IN (SELECT id FROM public.clinics));

CREATE POLICY "Admins can view all redemption logs" ON public.perk_redemption_logs
  FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON public.appointments TO anon, authenticated;
GRANT ALL ON public.clinic_messages TO anon, authenticated;
GRANT ALL ON public.card_activation_logs TO anon, authenticated;
GRANT ALL ON public.perk_redemption_logs TO anon, authenticated;

-- Trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinic_messages_updated_at
  BEFORE UPDATE ON public.clinic_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sample appointment request (for testing)
INSERT INTO public.appointments (
  clinic_id,
  patient_name,
  patient_phone,
  patient_email,
  appointment_date,
  appointment_time,
  service_type,
  notes,
  status,
  requested_by
) VALUES (
  (SELECT id FROM public.clinics LIMIT 1), -- Get first clinic if exists
  'John Doe',
  '+1 (555) 123-4567',
  'john.doe@email.com',
  CURRENT_DATE + INTERVAL '3 days',
  '2:00 PM',
  'Dental Cleaning',
  'Regular checkup and cleaning appointment',
  'pending',
  'admin'
) ON CONFLICT DO NOTHING;

-- Sample clinic message (for testing)
INSERT INTO public.clinic_messages (
  clinic_id,
  subject,
  message,
  message_type,
  status,
  sent_by
) VALUES (
  (SELECT id FROM public.clinics LIMIT 1), -- Get first clinic if exists
  'Welcome Message',
  'Welcome to the MOCARDS system! Please let us know if you need any assistance.',
  'general',
  'unread',
  'System Administrator'
) ON CONFLICT DO NOTHING;