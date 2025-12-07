import { useState, useEffect } from 'react';
import { CalendarPicker } from './CalendarPicker';
import { dbOperations, Appointment, Card, Clinic } from '../lib/supabase';

interface AdminAppointmentBookingProps {
  adminUserId: string;
}

export function AdminAppointmentBooking({ adminUserId }: AdminAppointmentBookingProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'manage'>('book');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Booking form state
  const [controlNumber, setControlNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [validatedCard, setValidatedCard] = useState<Card | null>(null);
  const [selectedPerkType, setSelectedPerkType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [cardholderPhone, setCardholderPhone] = useState('');
  const [cardholderEmail, setCardholderEmail] = useState('');
  const [cardholderNotes, setCardholderNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('');

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const perkTypes = [
    { value: 'consultation', label: 'Dental Consultation', description: 'General dental checkup and consultation' },
    { value: 'cleaning', label: 'Dental Cleaning', description: 'Professional teeth cleaning service' },
    { value: 'extraction', label: 'Tooth Extraction', description: 'Tooth removal procedure' },
    { value: 'fluoride', label: 'Fluoride Treatment', description: 'Fluoride application for tooth protection' },
    { value: 'whitening', label: 'Teeth Whitening', description: 'Professional teeth whitening treatment' },
    { value: 'xray', label: 'Dental X-Ray', description: 'Dental imaging and examination' },
    { value: 'denture', label: 'Denture Service', description: 'Denture fitting or adjustment' },
    { value: 'braces', label: 'Braces Consultation', description: 'Orthodontic consultation and planning' }
  ];

  useEffect(() => {
    loadClinics();
    loadAppointments();
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [filterStatus]);

  const loadClinics = async () => {
    try {
      const clinicsData = await dbOperations.getAllClinics();
      setClinics(clinicsData);
    } catch (err) {
      console.error('Error loading clinics:', err);
    }
  };

  const loadAppointments = async () => {
    try {
      const filters = {
        admin_id: adminUserId,
        ...(filterStatus && { status: filterStatus })
      };
      const appointmentsData = await dbOperations.getAppointments(filters);
      setAppointments(appointmentsData);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  };

  const validateCard = async () => {
    if (!controlNumber || !passcode) {
      setError('Please enter both control number and passcode');
      return;
    }

    setLoading(true);
    setError('');
    setValidatedCard(null);

    try {
      const card = await dbOperations.getCardByControlNumber(controlNumber, passcode);

      if (!card) {
        setError('Invalid card credentials');
        return;
      }

      if (card.status !== 'activated') {
        setError('Card must be activated to book appointments');
        return;
      }

      setValidatedCard(card);
      setSuccess('Card validated successfully!');

      // Set the clinic if card is already assigned
      if (card.assigned_clinic_id) {
        setSelectedClinic(card.assigned_clinic_id);
      }
    } catch (err) {
      console.error('Error validating card:', err);
      setError('Failed to validate card');
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async () => {
    if (!validatedCard || !selectedPerkType || !selectedDate || !selectedTime) {
      setError('Please fill in all required fields');
      return;
    }

    // Check if the perk is still available
    const availablePerks = validatedCard.perks?.filter(p => !p.claimed && p.perk_type === selectedPerkType);
    if (!availablePerks || availablePerks.length === 0) {
      setError('This perk has already been claimed');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const appointmentData = {
        card_id: validatedCard.id,
        control_number: controlNumber,
        passcode: passcode,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        perk_type: selectedPerkType,
        cardholder_phone: cardholderPhone,
        cardholder_email: cardholderEmail,
        cardholder_notes: cardholderNotes,
        assigned_clinic_id: selectedClinic || validatedCard.assigned_clinic_id,
        booked_by_admin_id: adminUserId,
        admin_notes: adminNotes,
        status: 'waiting_for_approval' as const
      };

      const appointment = await dbOperations.createAppointment(appointmentData);

      // Create notification for the clinic
      if (appointmentData.assigned_clinic_id) {
        await dbOperations.createAppointmentNotification({
          appointment_id: appointment.id,
          notification_type: 'booking_request',
          recipient_type: 'clinic',
          recipient_id: appointmentData.assigned_clinic_id,
          message: `New appointment request for ${selectedPerkType} on ${selectedDate} at ${selectedTime}`
        });
      }

      // Reset form
      resetForm();
      setSuccess('Appointment booked successfully! Waiting for clinic approval.');
      setActiveTab('manage');
      loadAppointments();
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setControlNumber('');
    setPasscode('');
    setValidatedCard(null);
    setSelectedPerkType('');
    setSelectedDate('');
    setSelectedTime('');
    setCardholderPhone('');
    setCardholderEmail('');
    setCardholderNotes('');
    setAdminNotes('');
    setSelectedClinic('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting_for_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_reschedule':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'approved_reschedule':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_for_approval':
        return 'Waiting for Approval';
      case 'approved':
        return 'Approved';
      case 'pending_reschedule':
        return 'Pending Reschedule';
      case 'approved_reschedule':
        return 'Rescheduled';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Appointment Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Centralized appointment booking for MOCARDS perks</p>
        </div>

        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'book'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="hidden sm:inline">Book</span> Appointment
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="hidden sm:inline">Manage</span> Appointments
          </button>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm border border-green-100">
          {success}
        </div>
      )}

      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Card Validation */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Step 1: Validate MOCARD</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Control Number
                </label>
                <input
                  type="text"
                  value={controlNumber}
                  onChange={(e) => setControlNumber(e.target.value)}
                  placeholder="e.g. MO-C000001-001"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Passcode
                </label>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="6-digit passcode"
                  maxLength={6}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                onClick={validateCard}
                disabled={loading || !controlNumber || !passcode}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Validating...' : 'Validate Card'}
              </button>
            </div>

            {validatedCard && (
              <div className="mt-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Card Validated ✓</h4>
                <div className="text-xs sm:text-sm text-green-700 space-y-1">
                  <div><strong>Control:</strong> <span className="break-all">{validatedCard.control_number}</span></div>
                  <div><strong>Status:</strong> {validatedCard.status}</div>
                  <div><strong>Clinic:</strong> {validatedCard.clinic?.clinic_name || 'Not assigned'}</div>
                  <div><strong>Available Perks:</strong> {validatedCard.perks?.filter(p => !p.claimed).length || 0}</div>
                </div>
              </div>
            )}
          </div>

          {/* Appointment Details */}
          {validatedCard && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Step 2: Appointment Details</h3>

              <div className="space-y-4">
                {/* Perk Selection */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Select Perk Type
                  </label>
                  <select
                    value={selectedPerkType}
                    onChange={(e) => setSelectedPerkType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Choose a perk...</option>
                    {perkTypes
                      .filter(perk =>
                        validatedCard.perks?.some(cardPerk =>
                          cardPerk.perk_type === perk.value && !cardPerk.claimed
                        )
                      )
                      .map(perk => (
                        <option key={perk.value} value={perk.value}>
                          {perk.label}
                        </option>
                      ))
                    }
                  </select>
                  {selectedPerkType && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {perkTypes.find(p => p.value === selectedPerkType)?.description}
                    </p>
                  )}
                </div>

                {/* Clinic Selection */}
                {!validatedCard.assigned_clinic_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Clinic
                    </label>
                    <select
                      value={selectedClinic}
                      onChange={(e) => setSelectedClinic(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">Choose a clinic...</option>
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.clinic_name} ({clinic.clinic_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={cardholderPhone}
                      onChange={(e) => setCardholderPhone(e.target.value)}
                      placeholder="Cardholder's phone"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={cardholderEmail}
                      onChange={(e) => setCardholderEmail(e.target.value)}
                      placeholder="Cardholder's email"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Notes
                  </label>
                  <textarea
                    value={cardholderNotes}
                    onChange={(e) => setCardholderNotes(e.target.value)}
                    placeholder="Any special requests or notes from the cardholder..."
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Internal)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes for clinic reference..."
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Calendar */}
          {validatedCard && selectedPerkType && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Step 3: Select Date & Time</h3>

                <CalendarPicker
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateChange={setSelectedDate}
                  onTimeChange={setSelectedTime}
                  minDate={new Date().toISOString().split('T')[0]}
                  disabledDays={[0, 6]} // Disable weekends
                  workingHours={{ start: '09:00', end: '17:00' }}
                />

                {selectedDate && selectedTime && (
                  <div className="mt-6">
                    <button
                      onClick={bookAppointment}
                      disabled={loading}
                      className="w-full bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 text-base sm:text-lg"
                    >
                      {loading ? 'Booking Appointment...' : 'Book Appointment'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">All Appointments</option>
                <option value="waiting_for_approval">Waiting for Approval</option>
                <option value="approved">Approved</option>
                <option value="pending_reschedule">Pending Reschedule</option>
                <option value="approved_reschedule">Rescheduled</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
              <span className="text-xs sm:text-sm text-gray-500">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            {appointments.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
                No appointments found. Start by booking your first appointment.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                            {perkTypes.find(p => p.value === appointment.perk_type)?.label || appointment.perk_type}
                          </h4>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border self-start ${getStatusColor(appointment.status)}`}>
                            {getStatusLabel(appointment.status)}
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                            <div><strong>Card:</strong> <span className="break-all">{appointment.control_number}</span></div>
                            <div><strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleDateString()}</div>
                            <div><strong>Time:</strong> {appointment.appointment_time}</div>
                          </div>
                          {appointment.clinic && (
                            <div><strong>Clinic:</strong> {appointment.clinic.clinic_name}</div>
                          )}
                          {appointment.cardholder_phone && (
                            <div><strong>Contact:</strong> {appointment.cardholder_phone}</div>
                          )}
                          {appointment.cardholder_notes && (
                            <div><strong>Notes:</strong> <span className="break-words">{appointment.cardholder_notes}</span></div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 sm:ml-4 self-start sm:self-auto">
                        Created {new Date(appointment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}