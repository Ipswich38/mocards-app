-- ===================================================================
-- MOCARDS APPOINTMENT BOOKING SYSTEM SCHEMA (SAFE VERSION)
-- Handles existing tables gracefully
-- ===================================================================

-- Create appointments table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Card and Patient Information
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  control_number VARCHAR(20) NOT NULL,
  passcode VARCHAR(10) NOT NULL, -- Updated to match new length

  -- Appointment Details
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  perk_type VARCHAR(50) NOT NULL, -- consultation, cleaning, extraction, etc.

  -- Contact Information
  cardholder_phone VARCHAR(20),
  cardholder_email VARCHAR(255),
  cardholder_notes TEXT,

  -- Assignment and Status
  assigned_clinic_id UUID REFERENCES public.mocards_clinics(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'waiting_for_approval',
  -- Possible statuses: waiting_for_approval, approved, pending_reschedule, approved_reschedule, cancelled, completed

  -- Admin and Clinic Actions
  booked_by_admin_id UUID REFERENCES public.mocards_admin_users(id),
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

-- Update existing appointments table to handle longer passcodes
DO $$
BEGIN
  -- Try to alter the passcode column if it exists and needs updating
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
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
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
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_appointments_card_id ON public.appointments(card_id);
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

-- Function to reschedule appointment
CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id UUID,
  p_new_date DATE,
  p_new_time TIME,
  p_reschedule_reason TEXT,
  p_changed_by VARCHAR(20),
  p_changed_by_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Store original date/time and update with new ones
  UPDATE public.appointments
  SET
    original_date = COALESCE(original_date, appointment_date),
    original_time = COALESCE(original_time, appointment_time),
    appointment_date = p_new_date,
    appointment_time = p_new_time,
    reschedule_reason = p_reschedule_reason,
    updated_at = NOW()
  WHERE id = p_appointment_id;

  -- Update status based on who is rescheduling
  IF p_changed_by = 'clinic' THEN
    PERFORM public.update_appointment_status(
      p_appointment_id, 'pending_reschedule', p_changed_by, p_changed_by_id, p_reschedule_reason
    );
  ELSE
    PERFORM public.update_appointment_status(
      p_appointment_id, 'approved_reschedule', p_changed_by, p_changed_by_id, p_reschedule_reason
    );
  END IF;
END;
$$;

-- ===================================================================
-- VERIFICATION
-- ===================================================================
SELECT 'Appointment booking schema updated successfully!' as status;