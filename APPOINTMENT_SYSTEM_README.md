# MOCARDS Appointment Booking System

## Overview

A comprehensive calendar booking/appointment module has been implemented for the MOCARDS admin system. This allows admin accounts to act as centralized dental clinic appointment setters, where cardholders can call/message to claim/redeem perks through scheduled appointments.

## Features Implemented

### 1. Database Schema (`appointments-schema.sql`)

**Main Tables:**
- `appointments` - Core appointment data with card validation, scheduling, and status management
- `appointment_status_history` - Audit trail for all status changes
- `appointment_notifications` - Communication system between admin/clinic/cardholder

**Key Features:**
- Card validation integration (control number + passcode)
- Comprehensive status workflow
- Reschedule tracking (original vs new date/time)
- Contact information and notes system
- Foreign key relationships with existing tables

### 2. API Operations (Updated `src/lib/supabase.ts`)

**New Appointment Operations:**
- `createAppointment()` - Book new appointments
- `getAppointments()` - Fetch with advanced filtering
- `getAppointmentById()` - Get single appointment details
- `updateAppointmentStatus()` - Status management with history logging
- `rescheduleAppointment()` - Handle reschedule requests
- `getAppointmentHistory()` - Audit trail access
- `createAppointmentNotification()` - Communication system
- `getUnreadNotifications()` - Notification management
- `markNotificationAsRead()` - Mark notifications as read
- `getAllClinics()` - Clinic selection support

### 3. Calendar Component (`src/components/CalendarPicker.tsx`)

**Features:**
- Interactive calendar with date selection
- Time slot picker with configurable working hours
- Weekend/holiday blocking
- Past date prevention
- Responsive design
- Two-phase selection (date first, then time)

### 4. Admin Appointment Interface (`src/components/AdminAppointmentBooking.tsx`)

**Booking Flow:**
1. **Card Validation**: Enter control number + passcode
2. **Appointment Details**: Select perk type, clinic, contact info
3. **Date & Time Selection**: Interactive calendar picker
4. **Booking Confirmation**: Submit to "waiting_for_approval" status

**Management Features:**
- View all appointments with filtering
- Status tracking and history
- Real-time appointment list
- Contact information display

### 5. Clinic Dashboard Integration (`src/components/ClinicDashboard.tsx`)

**New "Appointments" Tab:**
- Pending approval notifications (badge counter)
- Comprehensive appointment review
- Action buttons: Approve / Request Reschedule
- Status management with notifications
- Quick stats dashboard

**Admin Dashboard Integration:**
- Added to SuperAdminDashboard as new "Appointments" tab
- Full appointment booking and management interface

## Appointment Status Workflow

```
[Admin Books] → waiting_for_approval
     ↓
[Clinic Action]:
├── Approve → approved
├── Request Reschedule → pending_reschedule
     ↓
[Admin Updates] → approved_reschedule
     ↓
[Final Status] → completed/cancelled
```

## Status Types

1. **waiting_for_approval** - Initial state, admin has booked, waiting for clinic
2. **approved** - Clinic approved the appointment
3. **pending_reschedule** - Clinic requested reschedule, waiting for admin
4. **approved_reschedule** - New date/time confirmed
5. **cancelled** - Appointment cancelled
6. **completed** - Service completed

## Setup Instructions

### 1. Database Setup

Run the SQL schema in your Supabase dashboard:
```bash
# Execute the contents of appointments-schema.sql
```

### 2. Environment Setup

Ensure your `.env` file has Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Demo Credentials

**Admin Login:**
- Username: `admin`
- Password: `admin123`

**Clinic Login:**
- Clinic Code: `DEMO001`
- Password: `demo123`

**Demo Card:**
- Control Number: `MO-C000001-001`
- Passcode: `123456`

## Testing Workflow

### Complete Booking Flow Test:

1. **Login as Admin** (`admin` / `admin123`)
2. **Navigate to "Appointments" tab**
3. **Book New Appointment:**
   - Enter demo card: `MO-C000001-001` / `123456`
   - Select available perk (e.g., "Dental Consultation")
   - Choose future date and time
   - Add contact info and notes
   - Submit booking

4. **Switch to Clinic View** (login as `DEMO001` / `demo123`)
5. **Check "Appointments" tab:**
   - Should see pending appointment with notification badge
   - Review appointment details
   - Test "Approve" or "Request Reschedule" actions

6. **Return to Admin View:**
   - Check status change in appointment management
   - Verify notifications work correctly

## Key Features

### For Admins (Centralized Appointment Setters):
- Validate MOCARDS with control number + passcode
- Book appointments for any available perk
- Manage cardholder contact information
- Track appointment status in real-time
- Handle reschedule requests

### For Clinics:
- Receive appointment requests with all details
- Approve appointments with one click
- Request reschedules when needed
- View appointment calendar
- Contact information readily available

### For Cardholders (via Admin):
- Professional appointment booking service
- Validated card perk redemption
- Flexible scheduling options
- Direct clinic communication channel

## Technical Notes

- All appointment operations include audit logging
- Status changes trigger automatic notifications
- Card validation prevents invalid bookings
- Reschedule system preserves original appointment data
- Responsive design works on all devices
- Real-time updates between admin and clinic views

## Security Features

- Card validation required for all bookings
- Perk availability verification
- Clinic assignment validation
- Audit trail for all changes
- Row-level security policies (ready for production)

The appointment booking system is now fully integrated and ready for testing with the existing MOCARDS demo environment.