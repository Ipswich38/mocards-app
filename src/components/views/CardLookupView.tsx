import { useState } from 'react';
import { Search, Camera, Sparkles, Calendar, User, Gift, Shield, Clock, Send, Phone, Mail } from 'lucide-react';
import { cardOperations, clinicOperations, type Card, formatDate } from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

export function CardLookupView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  // Appointment Request State
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    preferredDate: '',
    preferredTime: '',
    perkType: 'dental_cleaning',
    notes: ''
  });

  const { addToast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      addToast(toastWarning('Empty Search', 'Please enter a MOC card number'));
      return;
    }

    setIsLoading(true);
    setIsNotFound(false);
    setSearchResult(null);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const result = cardOperations.getByControlNumber(searchQuery.trim());

      if (result) {
        setSearchResult(result);
        addToast(toastSuccess('Card Found', 'Card information retrieved successfully'));
      } else {
        setIsNotFound(true);
        addToast(toastWarning('Card Not Found', 'No MOC card found with this number'));
      }
    } catch (error) {
      addToast(toastError('Search Error', 'Failed to search for card'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleFeelingLucky = () => {
    // Pick a random card for demo
    const allCards = cardOperations.getAll();
    if (allCards.length > 0) {
      const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
      setSearchQuery(randomCard.controlNumber);
      setTimeout(() => handleSearch(), 100);
    }
  };

  const getClinicName = (clinicId: string): string => {
    const clinic = clinicOperations.getById(clinicId);
    return clinic?.name || 'No clinic assigned';
  };

  // Appointment Request Handlers
  const handleAppointmentRequest = () => {
    if (!searchResult) {
      addToast(toastWarning('No Card Selected', 'Please search for a valid MOC card first'));
      return;
    }
    setShowAppointmentForm(true);
  };

  const handleSubmitAppointmentRequest = () => {
    if (!appointmentForm.patientName || !appointmentForm.patientEmail || !appointmentForm.preferredDate || !appointmentForm.preferredTime) {
      addToast(toastWarning('Missing Information', 'Please fill in all required fields'));
      return;
    }

    // Simulate sending request to admin
    addToast(toastSuccess(
      'Request Submitted',
      'Your appointment request has been sent to MOCARDS admin for review. You will be contacted soon!'
    ));

    // Reset form and hide
    setAppointmentForm({
      patientName: '',
      patientEmail: '',
      patientPhone: '',
      preferredDate: '',
      preferredTime: '',
      perkType: 'dental_cleaning',
      notes: ''
    });
    setShowAppointmentForm(false);
  };

  const perkOptions = [
    { value: 'dental_cleaning', label: 'Free Dental Cleaning' },
    { value: 'consultation', label: 'Free Consultation' },
    { value: 'xray', label: 'X-Ray (50% discount)' },
    { value: 'treatment', label: 'Treatment (20% discount)' },
    { value: 'general_discount', label: 'General Discount (10%)' }
  ];

  return (
    <div className="dark-search-container min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col items-center pt-20 pb-8">
        {/* MOCARDS Logo */}
        <h1 className="text-6xl font-normal text-white mb-8 select-none">
          MOCARDS
        </h1>

        {/* Search Bar */}
        <div className="relative w-full max-w-xl mb-8">
          <div className="flex items-center dark-search-bar">
            <Search className="h-5 w-5 text-gray-400 mr-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter MOC control number"
              className="flex-1 bg-transparent text-white outline-none"
              disabled={isLoading}
            />
            <div className="flex items-center space-x-2 ml-4">
              <Camera className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-300" />
              <Sparkles className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-300" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'MOCARDS Search'}
          </button>
          <button
            onClick={handleFeelingLucky}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            I'm Feeling Lucky
          </button>
        </div>
      </div>

      {/* Results Section */}
      {(searchResult || isNotFound || isLoading) && (
        <div className="max-w-4xl mx-auto px-6 pb-20">
          {/* Loading State */}
          {isLoading && (
            <div className="dark-card p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-600 border-t-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Searching MOCARDS registry...</p>
            </div>
          )}

          {/* Search Result - Digital ID Card */}
          {searchResult && !isLoading && (
            <div className="space-y-6">
              {/* Main Card Display */}
              <div className="dark-card p-8">
                <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white mb-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">MOCARDS</h2>
                      <p className="text-teal-100">Philippines Healthcare Card</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      searchResult.status === 'active'
                        ? 'bg-green-400 text-green-900'
                        : 'bg-red-400 text-red-900'
                    }`}>
                      {searchResult.status === 'active' ? '✅ ACTIVE' : '❌ INACTIVE'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-teal-200 text-sm">Control Number</p>
                      <p className="text-2xl font-mono font-bold">{searchResult.controlNumber}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-teal-200 text-sm">Cardholder Name</p>
                        <p className="text-lg font-semibold">{searchResult.fullName}</p>
                      </div>
                      <div>
                        <p className="text-teal-200 text-sm">Expires</p>
                        <p className="text-lg font-semibold">{formatDate(searchResult.expiryDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
                  {/* Cardholder Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Cardholder Information</h3>

                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Full Name</p>
                        <p className="text-white">{searchResult.fullName}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Assigned Clinic</p>
                        <p className="text-white">{getClinicName(searchResult.clinicId)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Card Status</p>
                        <p className={`capitalize ${
                          searchResult.status === 'active' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {searchResult.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Healthcare Benefits</h3>

                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Total Perks</p>
                        <p className="text-white">{searchResult.perksTotal} benefits</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Used Perks</p>
                        <p className="text-white">{searchResult.perksUsed} utilized</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Available Perks</p>
                        <p className="text-green-400 font-semibold">
                          {searchResult.perksTotal - searchResult.perksUsed} remaining
                        </p>
                      </div>
                    </div>

                    {/* Perks Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Benefits Usage</span>
                        <span>{searchResult.perksUsed}/{searchResult.perksTotal}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(searchResult.perksUsed / searchResult.perksTotal) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Request Section */}
              {searchResult.status === 'active' && (
                <div className="dark-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-teal-400" />
                      <h3 className="text-lg font-semibold text-white">Schedule Appointment</h3>
                    </div>
                    {!showAppointmentForm && (
                      <button
                        onClick={handleAppointmentRequest}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        Request Appointment
                      </button>
                    )}
                  </div>

                  <p className="text-gray-300 text-sm mb-4">
                    Contact MOCARDS admin to schedule an appointment for claiming your healthcare benefits.
                  </p>

                  {showAppointmentForm && (
                    <div className="space-y-4 border-t border-gray-600 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={appointmentForm.patientName}
                            onChange={(e) => setAppointmentForm(prev => ({ ...prev, patientName: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Enter your full name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="email"
                              value={appointmentForm.patientEmail}
                              onChange={(e) => setAppointmentForm(prev => ({ ...prev, patientEmail: e.target.value }))}
                              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="your.email@example.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="tel"
                              value={appointmentForm.patientPhone}
                              onChange={(e) => setAppointmentForm(prev => ({ ...prev, patientPhone: e.target.value }))}
                              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="+63917123456"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Preferred Benefit
                          </label>
                          <select
                            value={appointmentForm.perkType}
                            onChange={(e) => setAppointmentForm(prev => ({ ...prev, perkType: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            {perkOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Preferred Date *
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="date"
                              value={appointmentForm.preferredDate}
                              onChange={(e) => setAppointmentForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Preferred Time *
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="time"
                              value={appointmentForm.preferredTime}
                              onChange={(e) => setAppointmentForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Additional Notes
                        </label>
                        <textarea
                          value={appointmentForm.notes}
                          onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="Any specific requests or health concerns..."
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSubmitAppointmentRequest}
                          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Submit Request
                        </button>
                        <button
                          onClick={() => setShowAppointmentForm(false)}
                          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="bg-teal-900/30 border border-teal-600/50 rounded-lg p-4 mt-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="text-teal-300 font-medium mb-1">Next Steps:</p>
                            <ol className="text-teal-100 space-y-1">
                              <li>1. Admin will review your request within 24 hours</li>
                              <li>2. Request will be forwarded to the assigned clinic</li>
                              <li>3. Clinic will contact you to confirm the appointment</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Not Found State */}
          {isNotFound && !isLoading && (
            <div className="dark-card p-8 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No card found</h3>
              <p className="text-gray-300 mb-4">
                No MOC card found with the number "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsNotFound(false);
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Try another search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}