-- ===================================================================
-- MOCARDS APPOINTMENT BOOKING SYSTEM SCHEMA (SIMPLIFIED VERSION)
-- Works with existing table structure, no complex foreign keys
-- ===================================================================

-- Create appointments table with minimal dependencies
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Card Information (stored as text to avoid foreign key issues)
  control_number VARCHAR(20) NOT NULL,
  passcode VARCHAR(10) NOT NULL,

  -- Appointment Details
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  perk_type VARCHAR(50) NOT NULL, -- consultation, cleaning, extraction, etc.

  -- Contact Information
  cardholder_phone VARCHAR(20),
  cardholder_email VARCHAR(255),
  cardholder_notes TEXT,

  -- Clinic Assignment (stored as text to avoid foreign key issues)
  assigned_clinic_id UUID,
  status VARCHAR(30) DEFAULT 'waiting_for_approval',
  -- Possible statuses: waiting_for_approval, approved, pending_reschedule, approved_reschedule, cancelled, completed

  -- Admin and Clinic Actions
  booked_by_admin_id UUID,
  approved_by_clinic_id UUID,
  approved_at TIMESTAMP,

  -- Reschedule Information
  original_date DATE,
  original_time TIME,
  reschedule_reason TEXT,
  reschedule_requested_at TIMESTAMP,
  reschedule_approved_at TIMESTAMP,

  -- Communication Log
  clinic_contact_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update existing appointments table structure
DO $$
BEGIN
  -- Add missing columns one by one
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'control_number') THEN
    ALTER TABLE public.appointments ADD COLUMN control_number VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'passcode') THEN
    ALTER TABLE public.appointments ADD COLUMN passcode VARCHAR(10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_date') THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_time') THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_time TIME;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'perk_type') THEN
    ALTER TABLE public.appointments ADD COLUMN perk_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'cardholder_phone') THEN
    ALTER TABLE public.appointments ADD COLUMN cardholder_phone VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'cardholder_email') THEN
    ALTER TABLE public.appointments ADD COLUMN cardholder_email VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'cardholder_notes') THEN
    ALTER TABLE public.appointments ADD COLUMN cardholder_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'assigned_clinic_id') THEN
    ALTER TABLE public.appointments ADD COLUMN assigned_clinic_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'status') THEN
    ALTER TABLE public.appointments ADD COLUMN status VARCHAR(30) DEFAULT 'waiting_for_approval';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'booked_by_admin_id') THEN
    ALTER TABLE public.appointments ADD COLUMN booked_by_admin_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'approved_by_clinic_id') THEN
    ALTER TABLE public.appointments ADD COLUMN approved_by_clinic_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'approved_at') THEN
    ALTER TABLE public.appointments ADD COLUMN approved_at TIMESTAMP;
  END IF;

  -- Update passcode column length if it exists and is too small
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments'
    AND column_name = 'passcode'
    AND character_maximum_length < 10
  ) THEN
    ALTER TABLE public.appointments ALTER COLUMN passcode TYPE VARCHAR(10);
  END IF;

END $$;

-- Create appointment status history table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID,
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  changed_by VARCHAR(20) NOT NULL, -- 'admin', 'clinic'
  changed_by_id UUID,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create appointment notifications table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.appointment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID,
  notification_type VARCHAR(50) NOT NULL, -- 'booking_request', 'approved', 'reschedule_request', 'cancelled'
  recipient_type VARCHAR(20) NOT NULL, -- 'admin', 'clinic', 'cardholder'
  recipient_id UUID,
  message TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE (CREATE IF NOT EXISTS)
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_control_number ON public.appointments(control_number);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(assigned_clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_admin ON public.appointments(booked_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_appointment_history_appointment ON public.appointment_status_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_appointment ON public.appointment_notifications(appointment_id);

-- ===================================================================
-- ROW LEVEL SECURITY & POLICIES (SAFE VERSION)
-- ===================================================================
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

-- Safely drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all access to appointments" ON public.appointments;
  DROP POLICY IF EXISTS "Allow all access to appointment history" ON public.appointment_status_history;
  DROP POLICY IF EXISTS "Allow all access to appointment notifications" ON public.appointment_notifications;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Allow all access to appointment history" ON public.appointment_status_history FOR ALL USING (true);
CREATE POLICY "Allow all access to appointment notifications" ON public.appointment_notifications FOR ALL USING (true);

-- ===================================================================
-- GRANT PERMISSIONS
-- ===================================================================
GRANT ALL ON public.appointments TO anon, authenticated;
GRANT ALL ON public.appointment_status_history TO anon, authenticated;
GRANT ALL ON public.appointment_notifications TO anon, authenticated;

-- ===================================================================
-- FUNCTIONS FOR APPOINTMENT MANAGEMENT
-- ===================================================================

-- Function to update appointment status and log history
CREATE OR REPLACE FUNCTION public.update_appointment_status(
  p_appointment_id UUID,
  p_new_status VARCHAR(30),
  p_changed_by VARCHAR(20),
  p_changed_by_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  old_status VARCHAR(30);
BEGIN
  -- Get current status
  SELECT status INTO old_status FROM public.appointments WHERE id = p_appointment_id;

  -- Update appointment status
  UPDATE public.appointments
  SET
    status = p_new_status,
    updated_at = NOW(),
    approved_by_clinic_id = CASE WHEN p_new_status = 'approved' THEN p_changed_by_id ELSE approved_by_clinic_id END,
    approved_at = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE approved_at END,
    reschedule_requested_at = CASE WHEN p_new_status = 'pending_reschedule' THEN NOW() ELSE reschedule_requested_at END,
    reschedule_approved_at = CASE WHEN p_new_status = 'approved_reschedule' THEN NOW() ELSE reschedule_approved_at END
  WHERE id = p_appointment_id;

  -- Log status change
  INSERT INTO public.appointment_status_history (
    appointment_id, old_status, new_status, changed_by, changed_by_id, reason
  ) VALUES (
    p_appointment_id, old_status, p_new_status, p_changed_by, p_changed_by_id, p_reason
  );
END;
$$;

-- ===================================================================
-- VERIFICATION
-- ===================================================================
SELECT 'Simple appointment booking schema setup completed successfully!' as status;