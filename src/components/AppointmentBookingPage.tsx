import { useState } from 'react';
import { CalendarPicker } from './CalendarPicker';
import { dbOperations } from '../lib/supabase';

export function AppointmentBookingPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [cardDetails, setCardDetails] = useState({
    controlNumber: '',
    passcode: ''
  });
  const [appointmentDetails, setAppointmentDetails] = useState({
    perkType: 'consultation',
    contactPhone: '',
    contactEmail: '',
    notes: ''
  });
  const [currentStep, setCurrentStep] = useState<'card' | 'datetime' | 'details' | 'confirm'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const perkOptions = [
    { value: 'consultation', label: 'Dental Consultation', duration: '30 min', description: 'Complete oral health checkup' },
    { value: 'cleaning', label: 'Teeth Cleaning', duration: '45 min', description: 'Professional dental cleaning' },
    { value: 'extraction', label: 'Tooth Extraction', duration: '60 min', description: 'Safe tooth removal procedure' },
    { value: 'fluoride', label: 'Fluoride Treatment', duration: '20 min', description: 'Strengthen your teeth' },
    { value: 'whitening', label: 'Teeth Whitening', duration: '90 min', description: 'Professional whitening service' },
    { value: 'xray', label: 'Dental X-Ray', duration: '15 min', description: 'Digital dental imaging' },
    { value: 'denture', label: 'Denture Consultation', duration: '45 min', description: 'Denture fitting and consultation' },
    { value: 'braces', label: 'Orthodontic Consultation', duration: '60 min', description: 'Braces and alignment consultation' }
  ];

  // Available slots are handled by CalendarPicker component

  const handleCardVerification = async () => {
    if (!cardDetails.controlNumber || !cardDetails.passcode) {
      setMessage({ type: 'error', text: 'Please enter both control number and passcode' });
      return;
    }

    try {
      // Verify card exists and is activated
      const card = await dbOperations.getCardByControlNumber(cardDetails.controlNumber, cardDetails.passcode);

      if (card && card.status === 'activated') {
        setMessage({ type: 'success', text: 'Card verified! You can proceed with booking.' });
        setCurrentStep('datetime');
      } else {
        setMessage({ type: 'error', text: 'Invalid card details or card not activated' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Card not found or invalid credentials' });
    }
  };

  const handleDateTimeNext = () => {
    if (!selectedDate || !selectedTime) {
      setMessage({ type: 'error', text: 'Please select both date and time' });
      return;
    }
    setCurrentStep('details');
  };

  const handleDetailsNext = () => {
    if (!appointmentDetails.contactPhone && !appointmentDetails.contactEmail) {
      setMessage({ type: 'error', text: 'Please provide at least one contact method' });
      return;
    }
    setCurrentStep('confirm');
  };

  const handleSubmitAppointment = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const appointmentData = {
        control_number: cardDetails.controlNumber,
        passcode: cardDetails.passcode,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        perk_type: appointmentDetails.perkType,
        cardholder_phone: appointmentDetails.contactPhone || undefined,
        cardholder_email: appointmentDetails.contactEmail || undefined,
        cardholder_notes: appointmentDetails.notes || undefined,
        status: 'waiting_for_approval' as const
      };

      await dbOperations.createAppointment(appointmentData);

      setMessage({
        type: 'success',
        text: 'Appointment request submitted successfully! You will be contacted by the clinic soon.'
      });

      // Reset form after success
      setTimeout(() => {
        setCurrentStep('card');
        setSelectedDate('');
        setSelectedTime('');
        setCardDetails({ controlNumber: '', passcode: '' });
        setAppointmentDetails({
          perkType: 'consultation',
          contactPhone: '',
          contactEmail: '',
          notes: ''
        });
        setMessage(null);
      }, 3000);

    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to submit appointment. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'card': return 'Verify Your MOCARDS';
      case 'datetime': return 'Select Date & Time';
      case 'details': return 'Appointment Details';
      case 'confirm': return 'Confirm Your Appointment';
      default: return 'Book Appointment';
    }
  };

  const selectedPerk = perkOptions.find(p => p.value === appointmentDetails.perkType);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Book Your Dental Appointment
          </h1>
          <p className="text-gray-600">
            Use your MOCARDS to schedule your perk redemption appointment
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[
            { key: 'card', label: 'Verify Card', icon: '💳' },
            { key: 'datetime', label: 'Date & Time', icon: '📅' },
            { key: 'details', label: 'Details', icon: '📝' },
            { key: 'confirm', label: 'Confirm', icon: '✅' }
          ].map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                ${currentStep === step.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : index < ['card', 'datetime', 'details', 'confirm'].indexOf(currentStep)
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
                }
              `}>
                {index < ['card', 'datetime', 'details', 'confirm'].indexOf(currentStep) ? '✓' : step.icon}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep === step.key ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < 3 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  index < ['card', 'datetime', 'details', 'confirm'].indexOf(currentStep)
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {getStepTitle()}
          </h2>

          {/* Step 1: Card Verification */}
          {currentStep === 'card' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Control Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., MOC-12345678-001"
                    value={cardDetails.controlNumber}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, controlNumber: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passcode
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your card passcode"
                    value={cardDetails.passcode}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, passcode: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCardVerification}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Verify Card & Continue
              </button>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {currentStep === 'datetime' && (
            <div className="space-y-6">
              <CalendarPicker
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onDateChange={setSelectedDate}
                onTimeChange={setSelectedTime}
                disabledDays={[0, 6]} // Disable weekends
                workingHours={{ start: '09:00', end: '17:00' }}
              />
              <button
                onClick={handleDateTimeNext}
                disabled={!selectedDate || !selectedTime}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Details
              </button>
            </div>
          )}

          {/* Step 3: Appointment Details */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Perk to Redeem
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {perkOptions.map((perk) => (
                    <button
                      key={perk.value}
                      onClick={() => setAppointmentDetails(prev => ({ ...prev, perkType: perk.value }))}
                      className={`p-4 text-left border rounded-lg transition-all ${
                        appointmentDetails.perkType === perk.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{perk.label}</div>
                      <div className="text-sm text-gray-500">{perk.duration} • {perk.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="+63 xxx xxx xxxx"
                    value={appointmentDetails.contactPhone}
                    onChange={(e) => setAppointmentDetails(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address (optional)
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={appointmentDetails.contactEmail}
                    onChange={(e) => setAppointmentDetails(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (optional)
                </label>
                <textarea
                  placeholder="Any specific concerns or requests..."
                  value={appointmentDetails.notes}
                  onChange={(e) => setAppointmentDetails(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleDetailsNext}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Review Appointment
              </button>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="font-medium text-gray-900">Appointment Summary</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Service:</span>
                    <div className="font-medium">{selectedPerk?.label}</div>
                    <div className="text-gray-500">{selectedPerk?.duration}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Date & Time:</span>
                    <div className="font-medium">
                      {selectedDate ? new Date(selectedDate).toLocaleDateString() : ''} at {selectedTime}
                    </div>
                    <div className="text-gray-500">
                      {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' }) : ''}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Contact:</span>
                    <div className="font-medium">{appointmentDetails.contactPhone}</div>
                    {appointmentDetails.contactEmail && (
                      <div className="text-gray-500">{appointmentDetails.contactEmail}</div>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Card:</span>
                    <div className="font-medium">{cardDetails.controlNumber}</div>
                  </div>
                </div>

                {appointmentDetails.notes && (
                  <div>
                    <span className="text-gray-600">Notes:</span>
                    <div className="font-medium">{appointmentDetails.notes}</div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                  <strong>Next Steps:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Your appointment request will be sent to the clinic</li>
                    <li>The clinic will contact you to confirm the appointment</li>
                    <li>You'll receive a confirmation once approved</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('details')}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleSubmitAppointment}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Appointment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}