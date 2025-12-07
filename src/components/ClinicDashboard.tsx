import { useState, useEffect } from 'react';
import { dbOperations, Card, Appointment } from '../lib/supabase';

interface ClinicDashboardProps {
  clinicCredentials: {
    clinicId: string;
    clinicCode: string;
    clinicName: string;
    token: string;
  };
  onBack: () => void;
}

export function ClinicDashboard({ clinicCredentials, onBack }: ClinicDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'redemptions' | 'appointments'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchControl, setSearchControl] = useState('');
  const [foundCard, setFoundCard] = useState<Card | null>(null);
  const [clinicCards, setClinicCards] = useState<Card[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    activeCards: 0,
    todayRedemptions: 0,
    totalValue: 0,
    pendingAppointments: 0
  });

  useEffect(() => {
    loadClinicCards();
    loadStats();
    loadAppointments();
  }, []);

  const loadClinicCards = async () => {
    try {
      const cards = await dbOperations.getClinicCards(clinicCredentials.clinicId);
      setClinicCards(cards);
    } catch (err) {
      console.error('Error loading clinic cards:', err);
    }
  };

  const loadStats = async () => {
    try {
      const cards = await dbOperations.getClinicCards(clinicCredentials.clinicId);
      const activeCards = cards.filter(card => card.status === 'activated').length;

      // Calculate today's redemptions and total value
      let todayRedemptions = 0;
      let totalValue = 0;

      cards.forEach(card => {
        card.perks?.forEach(perk => {
          if (perk.claimed) {
            const claimedDate = new Date(perk.claimed_at || '');
            const today = new Date();
            if (claimedDate.toDateString() === today.toDateString()) {
              todayRedemptions++;
            }
            totalValue += getPerkValue(perk.perk_type);
          }
        });
      });

      // Load appointments to get pending count
      const appointmentsData = await dbOperations.getAppointments({
        clinic_id: clinicCredentials.clinicId,
        status: 'waiting_for_approval'
      });
      const pendingAppointments = appointmentsData.length;

      setStats({ activeCards, todayRedemptions, totalValue, pendingAppointments });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadAppointments = async () => {
    try {
      const appointmentsData = await dbOperations.getAppointments({
        clinic_id: clinicCredentials.clinicId
      });
      setAppointments(appointmentsData);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  };

  const getPerkValue = (perkType: string): number => {
    const values: Record<string, number> = {
      consultation: 500,
      cleaning: 800,
      extraction: 1500,
      fluoride: 300,
      whitening: 2500,
      xray: 1000,
      denture: 3000,
      braces: 5000
    };
    return values[perkType] || 0;
  };

  const handleCardLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFoundCard(null);

    try {
      const card = await dbOperations.getCardByControlNumber(searchControl);

      if (card) {
        setFoundCard(card);
      } else {
        setError('Card not found');
      }
    } catch (err) {
      console.error('Error looking up card:', err);
      setError('Failed to find card');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCard = async (cardId: string) => {
    try {
      await dbOperations.activateCard(cardId, clinicCredentials.clinicId);
      await dbOperations.logTransaction({
        card_id: cardId,
        transaction_type: 'activated',
        performed_by: 'clinic',
        performed_by_id: clinicCredentials.clinicId,
        details: { clinic_name: clinicCredentials.clinicName }
      });

      // Refresh data
      loadClinicCards();
      loadStats();
      setFoundCard(null);
      setSearchControl('');
    } catch (err) {
      console.error('Error activating card:', err);
      setError('Failed to activate card');
    }
  };

  const handleRedeemPerk = async (perkId: string, cardId: string) => {
    try {
      await dbOperations.claimPerk(perkId, clinicCredentials.clinicId);
      await dbOperations.logTransaction({
        card_id: cardId,
        transaction_type: 'perk_claimed',
        performed_by: 'clinic',
        performed_by_id: clinicCredentials.clinicId,
        details: { perk_id: perkId }
      });

      // Refresh data
      loadClinicCards();
      loadStats();
    } catch (err) {
      console.error('Error redeeming perk:', err);
      setError('Failed to redeem perk');
    }
  };

  const getPerkDisplayName = (perkType: string): string => {
    const names: Record<string, string> = {
      consultation: 'Dental Consultation',
      cleaning: 'Dental Cleaning',
      extraction: 'Tooth Extraction',
      fluoride: 'Fluoride Treatment',
      whitening: 'Teeth Whitening',
      xray: 'Dental X-Ray',
      denture: 'Denture Service',
      braces: 'Braces Discount'
    };
    return names[perkType] || perkType;
  };

  const handleApproveAppointment = async (appointmentId: string) => {
    try {
      await dbOperations.updateAppointmentStatus(
        appointmentId,
        'approved',
        'clinic',
        clinicCredentials.clinicId,
        'Appointment approved by clinic'
      );

      await dbOperations.createAppointmentNotification({
        appointment_id: appointmentId,
        notification_type: 'approved',
        recipient_type: 'admin',
        message: 'Appointment has been approved by the clinic'
      });

      loadAppointments();
      loadStats();
      setError('');
    } catch (err) {
      console.error('Error approving appointment:', err);
      setError('Failed to approve appointment');
    }
  };

  const handleRequestReschedule = async (appointmentId: string) => {
    try {
      await dbOperations.updateAppointmentStatus(
        appointmentId,
        'pending_reschedule',
        'clinic',
        clinicCredentials.clinicId,
        'Clinic requested reschedule'
      );

      await dbOperations.createAppointmentNotification({
        appointment_id: appointmentId,
        notification_type: 'reschedule_request',
        recipient_type: 'admin',
        message: 'Clinic has requested to reschedule this appointment'
      });

      loadAppointments();
      loadStats();
      setError('');
    } catch (err) {
      console.error('Error requesting reschedule:', err);
      setError('Failed to request reschedule');
    }
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
        return 'Reschedule Requested';
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-4 sm:py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={onBack}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg"
              >
                ← Back
              </button>
              <div>
                <div className="text-lg sm:text-2xl text-gray-900 tracking-tight">Clinic Portal</div>
                <div className="text-sm text-gray-500">Welcome, {clinicCredentials.clinicName}</div>
              </div>
            </div>

            <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'cards'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden sm:inline">Card </span>Management
              </button>
              <button
                onClick={() => setActiveTab('redemptions')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'redemptions'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Redemptions
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'appointments'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Appointments
                {stats.pendingAppointments > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                    {stats.pendingAppointments}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Active Cards</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">{stats.activeCards}</div>
                <div className="text-xs sm:text-sm text-gray-500">Total active patient cards</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Redemptions Today</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">{stats.todayRedemptions}</div>
                <div className="text-xs sm:text-sm text-gray-500">Perks redeemed today</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Pending Appointments</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">{stats.pendingAppointments}</div>
                <div className="text-xs sm:text-sm text-gray-500">Awaiting your approval</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Value</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">₱{stats.totalValue.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-gray-500">Customer rewards value</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Card Lookup & Activation</h3>
              <form onSubmit={handleCardLookup} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Enter control number (e.g. MO-C001-001)"
                  value={searchControl}
                  onChange={(e) => setSearchControl(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-teal-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {foundCard && (
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Found Card</h3>
                <div className="border border-gray-200 rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div>
                      <div className="font-mono text-base sm:text-lg break-all">{foundCard.control_number}</div>
                      <div className="text-xs sm:text-sm text-gray-500">Status: {foundCard.status}</div>
                    </div>
                    {foundCard.status === 'unactivated' && (
                      <button
                        onClick={() => handleActivateCard(foundCard.id)}
                        className="bg-teal-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors self-start sm:self-auto"
                      >
                        Activate Card
                      </button>
                    )}
                  </div>

                  {foundCard.status === 'activated' && foundCard.perks && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-3 text-sm sm:text-base">Available Perks</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {foundCard.perks.filter(perk => !perk.claimed).map((perk) => (
                          <button
                            key={perk.id}
                            onClick={() => handleRedeemPerk(perk.id, foundCard.id)}
                            className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors touch-manipulation"
                          >
                            <div className="font-medium text-blue-900 text-sm sm:text-base">{getPerkDisplayName(perk.perk_type)}</div>
                            <div className="text-xs sm:text-sm text-blue-600">Click to redeem</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Your Clinic Cards</h3>
              {clinicCards.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
                  No cards assigned to your clinic yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicCards.map((card) => (
                    <div key={card.id} className="border border-gray-200 rounded-xl p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-mono text-sm sm:text-base break-all">{card.control_number}</div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            Status: {card.status} •
                            Activated: {card.activated_at ? new Date(card.activated_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400 self-start sm:self-auto">
                          {card.perks?.filter(p => !p.claimed).length || 0} perks available
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'redemptions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Recent Redemptions</h3>
              {clinicCards.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
                  No redemptions found.
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicCards.flatMap(card =>
                    card.perks?.filter(perk => perk.claimed).map(perk => (
                      <div key={perk.id} className="border border-gray-100 rounded-xl p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm sm:text-base">{getPerkDisplayName(perk.perk_type)}</div>
                            <div className="text-xs sm:text-sm text-gray-500">Card: <span className="break-all">{card.control_number}</span></div>
                          </div>
                          <div className="text-left sm:text-right self-start sm:self-auto">
                            <div className="text-sm text-gray-900">₱{getPerkValue(perk.perk_type)}</div>
                            <div className="text-xs text-gray-400">
                              {perk.claimed_at ? new Date(perk.claimed_at).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    )) || []
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Appointment Management</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                Review and manage appointment requests from cardholders. Approve appointments or request reschedule if needed.
              </p>

              {appointments.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
                  No appointments found for your clinic.
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                            <h4 className="text-base sm:text-lg font-medium text-gray-900">
                              {getPerkDisplayName(appointment.perk_type)}
                            </h4>
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border self-start ${getStatusColor(appointment.status)}`}>
                              {getStatusLabel(appointment.status)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                            <div>
                              <strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleDateString()}
                            </div>
                            <div>
                              <strong>Time:</strong> {appointment.appointment_time}
                            </div>
                            <div>
                              <strong>Card:</strong> <span className="break-all">{appointment.control_number}</span>
                            </div>
                            <div>
                              <strong>Day:</strong> {new Date(appointment.appointment_date).toLocaleDateString(undefined, { weekday: 'long' })}
                            </div>
                          </div>

                          {appointment.cardholder_phone && (
                            <div className="text-xs sm:text-sm text-gray-600 mb-2 break-words">
                              <strong>Contact:</strong> {appointment.cardholder_phone}
                              {appointment.cardholder_email && <span className="block sm:inline"> | {appointment.cardholder_email}</span>}
                            </div>
                          )}

                          {appointment.cardholder_notes && (
                            <div className="bg-blue-50 p-3 rounded-lg mb-3">
                              <div className="text-xs sm:text-sm font-medium text-blue-900 mb-1">Patient Notes:</div>
                              <div className="text-xs sm:text-sm text-blue-700 break-words">{appointment.cardholder_notes}</div>
                            </div>
                          )}

                          {appointment.admin_notes && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-3">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 mb-1">Admin Notes:</div>
                              <div className="text-xs sm:text-sm text-gray-700 break-words">{appointment.admin_notes}</div>
                            </div>
                          )}

                          {appointment.reschedule_reason && (
                            <div className="bg-orange-50 p-3 rounded-lg mb-3">
                              <div className="text-xs sm:text-sm font-medium text-orange-900 mb-1">Reschedule Reason:</div>
                              <div className="text-xs sm:text-sm text-orange-700 break-words">{appointment.reschedule_reason}</div>
                            </div>
                          )}

                          <div className="text-xs text-gray-400">
                            Booked on {new Date(appointment.created_at).toLocaleString()}
                          </div>
                        </div>

                        {appointment.status === 'waiting_for_approval' && (
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-6">
                            <button
                              onClick={() => handleApproveAppointment(appointment.id)}
                              className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors touch-manipulation"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRequestReschedule(appointment.id)}
                              className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-700 transition-colors touch-manipulation"
                            >
                              Request Reschedule
                            </button>
                          </div>
                        )}

                        {appointment.status === 'approved' && (
                          <div className="ml-6">
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                              ✓ Approved
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {appointment.approved_at && `Approved ${new Date(appointment.approved_at).toLocaleString()}`}
                            </div>
                          </div>
                        )}

                        {(appointment.status === 'pending_reschedule' || appointment.status === 'approved_reschedule') && (
                          <div className="ml-6">
                            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-medium">
                              📅 Reschedule Requested
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Waiting for new date/time
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Pending Approval</div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                  {appointments.filter(a => a.status === 'waiting_for_approval').length}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Approved</div>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {appointments.filter(a => a.status === 'approved').length}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Reschedule Requests</div>
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {appointments.filter(a => a.status === 'pending_reschedule' || a.status === 'approved_reschedule').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}