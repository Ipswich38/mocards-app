import { useState, useEffect } from 'react';
import { Calendar, Users, BarChart3, Clock, CreditCard, Plus, TrendingUp, Shield } from 'lucide-react';
import {
  clinicOperations,
  cardOperations,
  appointmentOperations,
  type Clinic,
  type CardData,
  type Appointment,
  formatDate,
  getStatusColor,
  PLAN_LIMITS
} from '../../lib/data';

export function ClinicPortalView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);
  const [clinicCode, setClinicCode] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dashboard data
  const [clinicCards, setClinicCards] = useState<CardData[]>([]);
  const [clinicAppointments, setClinicAppointments] = useState<Appointment[]>([]);

  // Appointment booking
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  useEffect(() => {
    if (currentClinic) {
      setClinicCards(cardOperations.getByClinicId(currentClinic.id));
      setClinicAppointments(appointmentOperations.getByClinicId(currentClinic.id));
    }
  }, [currentClinic]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const clinic = clinicOperations.authenticate(clinicCode, password);

    if (clinic) {
      setCurrentClinic(clinic);
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid clinic code or password');
    }

    setLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentClinic(null);
    setClinicCode('');
    setPassword('');
    setLoginError('');
  };

  const handleBookAppointment = async () => {
    if (!selectedCard || !appointmentDate || !appointmentTime || !currentClinic) return;

    const newAppointment = appointmentOperations.create({
      cardControlNumber: selectedCard.controlNumber,
      clinicId: currentClinic.id,
      patientName: selectedCard.fullName,
      date: appointmentDate,
      time: appointmentTime,
      status: 'scheduled',
    });

    setClinicAppointments([...clinicAppointments, newAppointment]);
    setShowBookingModal(false);
    setSelectedCard(null);
    setAppointmentDate('');
    setAppointmentTime('');
  };

  // Login Form - LIGHT THEME
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-[#1A535C] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Clinic Portal</h1>
            <p className="text-gray-600">Access your clinic dashboard</p>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinic Code
              </label>
              <input
                type="text"
                value={clinicCode}
                onChange={(e) => setClinicCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                placeholder="e.g., DEN001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !clinicCode || !password}
              className="w-full bg-[#1A535C] hover:bg-[#0f3a42] text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </>
              ) : (
                'Access Portal'
              )}
            </button>
          </form>

          {/* Sample Credentials for Testing */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Sample credentials for testing:</p>
            <div className="space-y-1">
              <p className="text-xs font-mono text-gray-800">DEN001 / dental123</p>
              <p className="text-xs font-mono text-gray-800">MED002 / health456</p>
              <p className="text-xs font-mono text-gray-800">CVT003 / premier789</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CLEAN LIGHT CLINIC DASHBOARD
  const cardCount = clinicOperations.getCardCount(currentClinic!.id);
  const cardLimit = clinicOperations.getCardLimit(currentClinic!.id);
  const usagePercentage = (cardCount / cardLimit) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Light Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentClinic!.name}</h1>
            <p className="text-gray-600 mt-1">Clinic Code: <span className="font-mono font-semibold">{currentClinic!.code}</span></p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-600">Plan:</span>
              <span className="text-sm font-medium text-gray-900 ml-1 uppercase">{currentClinic!.plan}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="px-8 py-6">
        {/* Subscription Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Subscription Status</h2>
            <div className="bg-[#1A535C] text-white px-4 py-2 rounded-full text-sm font-medium uppercase">
              {currentClinic!.plan}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-gray-600 mb-3">
              <span className="font-medium">Cards Used</span>
              <span className="font-semibold">{cardCount} of {cardLimit}</span>
            </div>
            <div className="bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-[#1A535C]'
                }`}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Plan limit: {PLAN_LIMITS[currentClinic!.plan]} cards
            </p>
          </div>

          {usagePercentage > 90 && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl">
              <p className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                ⚠️ Approaching Plan Limit
              </p>
              <p className="text-sm mt-1">Consider upgrading your plan to avoid service interruption.</p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{clinicCards.length}</p>
                <p className="text-gray-600">Active Patients</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-green-50 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{clinicAppointments.length}</p>
                <p className="text-gray-600">Appointments</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-purple-50 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {clinicCards.reduce((sum, card) => sum + card.perksUsed, 0)}
                </p>
                <p className="text-gray-600">Perks Claimed</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Patients Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">My Patients</h2>
              <div className="text-sm text-gray-500">
                {clinicCards.length} patients registered
              </div>
            </div>
          </div>

          {clinicCards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No patients assigned to this clinic yet</p>
              <p className="text-gray-400 text-sm mt-1">Patients will appear here once cards are assigned</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Control Number</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Perks</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Expires</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clinicCards.map((card) => (
                    <tr key={card.controlNumber} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{card.fullName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                          {card.controlNumber}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                          {card.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900 font-medium">
                          {card.perksUsed} / {card.perksTotal}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900">{formatDate(card.expiryDate)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSelectedCard(card);
                            setShowBookingModal(true);
                          }}
                          className="bg-[#1A535C] hover:bg-[#0f3a42] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Book
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Appointments</h2>
          </div>

          {clinicAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No appointments scheduled</p>
              <p className="text-gray-400 text-sm mt-1">Book appointments for your patients using the "Book" button</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {clinicAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-[#1A535C] w-12 h-12 rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">{appointment.patientName}</p>
                      <p className="text-sm text-gray-600 font-mono">{appointment.cardControlNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{appointment.date}</p>
                    <p className="text-sm text-gray-600">{appointment.time}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clean Light Booking Modal */}
      {showBookingModal && selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Book Appointment</h3>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600">Patient: <span className="font-medium text-gray-900">{selectedCard.fullName}</span></p>
              <p className="text-sm text-gray-600">Card: <code className="font-mono text-gray-800">{selectedCard.controlNumber}</code></p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBookAppointment}
                disabled={!appointmentDate || !appointmentTime}
                className="flex-1 bg-[#1A535C] hover:bg-[#0f3a42] text-white py-2 px-4 rounded-xl transition-colors disabled:opacity-50 font-medium"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}