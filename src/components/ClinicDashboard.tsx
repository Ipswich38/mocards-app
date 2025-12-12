import { useState, useEffect } from 'react';
import { dbOperations, Card, Appointment } from '../lib/supabase';
import { streamlinedOps } from '../lib/streamlined-operations';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
// Removed useAutoLogout hook dependency
import { ClinicPerkCustomization } from './ClinicPerkCustomization';
import { SearchComponent } from './SearchComponent';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'redemptions' | 'appointments' | 'perks' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchControl, setSearchControl] = useState('');
  const [foundCard, setFoundCard] = useState<Card | null>(null);
  const [clinicCards, setClinicCards] = useState<Card[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [stats, setStats] = useState({
    activeCards: 0,
    todayRedemptions: 0,
    totalValue: 0,
    pendingAppointments: 0
  });

  // Enhanced search functionality
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleLogout = () => {
    // Clear any stored clinic session data
    localStorage.removeItem('clinic-session');
    sessionStorage.removeItem('clinic-token');

    // Navigate back to login
    onBack();
  };

  const extendSession = () => {
    setShowLogoutWarning(false);
    // resetTimer is called automatically by user activity
  };

  // Auto-logout removed for streamlined version
  // TODO: Implement simple timeout if needed

  useEffect(() => {
    loadClinicCards();
    loadStats();
    loadAppointments();
  }, []);

  // Enhanced search functionality for clinic dashboard
  const getSearchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      // Get suggestions for cards assigned to this clinic
      const { data: clinicCardSuggestions } = await supabase
        .from('cards')
        .select('control_number, control_number_v2, card_number')
        .eq('assigned_clinic_id', clinicCredentials.clinicId)
        .or(`control_number.ilike.${query}%,control_number_v2.ilike.${query}%`)
        .limit(5);

      const suggestions = (clinicCardSuggestions || []).map(card => ({
        id: `control-${card.control_number || card.control_number_v2}`,
        text: card.control_number_v2 || card.control_number || '',
        type: 'control_number' as const,
        count: 1
      })).filter((suggestion, index, self) =>
        index === self.findIndex(s => s.text === suggestion.text) && suggestion.text
      );

      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
    }
  };

  const logSearchActivity = async (searchTerm: string, resultsFound: number) => {
    try {
      await supabase.rpc('log_search_activity', {
        p_user_id: clinicCredentials.clinicId,
        p_user_type: 'clinic',
        p_search_query: searchTerm,
        p_search_type: 'control_number',
        p_results_found: resultsFound,
        p_search_metadata: {
          interface: 'clinic_dashboard',
          clinic_name: clinicCredentials.clinicName,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.debug('Search logging not available:', error);
    }
  };

  const handleEnhancedSearch = async (query: string) => {
    setSearchControl(query);
    setSearchLoading(true);

    try {
      const card = await dbOperations.getCardByControlNumber(query);
      setFoundCard(card);

      // Log search activity
      logSearchActivity(query, card ? 1 : 0);
    } catch (err) {
      setFoundCard(null);
      setError('Card not found');
      logSearchActivity(query, 0);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchResultSelect = (result: any) => {
    if (result.type === 'card') {
      setFoundCard(result.card);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    handleEnhancedSearch(suggestion.text);
  };

  // Debounced search suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchControl.length >= 2) {
        getSearchSuggestions(searchControl);
      } else {
        setSearchSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchControl]);

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


  const handleAssignCard = async (cardId: string) => {
    setLoading(true);
    try {
      // Update the card to assign it to this clinic
      const { error: updateError } = await supabase
        .from('cards')
        .update({
          clinic_id: clinicCredentials.clinicId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          assigned_by: clinicCredentials.clinicId,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (updateError) throw updateError;

      // Log the assignment
      await dbOperations.logTransaction({
        card_id: cardId,
        transaction_type: 'assigned',
        performed_by: 'clinic',
        performed_by_id: clinicCredentials.clinicId,
        details: {
          assigned_by_clinic: clinicCredentials.clinicName,
          assigned_via: 'self_assignment'
        }
      });

      // Refresh data
      loadClinicCards();
      setFoundCard(null);
      setSearchControl('');
      setError('');

    } catch (err: any) {
      console.error('Error assigning card:', err);
      setError('Failed to assign card: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCard = async (cardId: string) => {
    try {
      // Prompt for staff member name who is activating the card
      const staffName = prompt('Enter the name of the staff member activating this card:');

      if (!staffName || staffName.trim() === '') {
        setError('Staff name is required for card activation');
        return;
      }

      // Use the new activation function with staff tracking
      const activatedCard = await streamlinedOps.activateCard(
        cardId,
        clinicCredentials.clinicId,
        clinicCredentials.clinicCode, // Staff ID/Code
        staffName.trim() // Staff Name
      );

      // Refresh data
      loadClinicCards();
      loadStats();
      setFoundCard(null);
      setSearchControl('');

      // Show success message
      setError('');
      console.log(`Card ${activatedCard.control_number} activated by ${staffName}`);
    } catch (err: any) {
      console.error('Error activating card:', err);
      setError(err.message || 'Failed to activate card');
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      // Get current clinic data to verify current password
      const { data: clinicData, error: fetchError } = await supabase
        .from('mocards_clinics')
        .select('password_hash')
        .eq('id', clinicCredentials.clinicId)
        .single();

      if (fetchError) throw fetchError;

      // Verify current password
      const isValidPassword = await bcrypt.compare(passwordData.currentPassword, clinicData.password_hash);
      if (!isValidPassword) {
        setPasswordError('Current password is incorrect');
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(passwordData.newPassword, 10);

      // Update password in database
      const { error: updateError } = await supabase
        .from('mocards_clinics')
        .update({
          password_hash: newPasswordHash,
          password_must_be_changed: false,
          last_password_change: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', clinicCredentials.clinicId);

      if (updateError) throw updateError;

      // Success
      setPasswordSuccess('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordChange(false);

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000);

    } catch (err: any) {
      setPasswordError('Failed to update password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-4 sm:py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header with title and logout */}
          <div className="flex items-center justify-between mb-4">
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

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-xs sm:text-sm text-gray-500 hover:text-red-600 transition-colors uppercase tracking-wider hover:bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-transparent hover:border-red-200"
              title="Logout"
            >
              <span className="hidden sm:inline">Logout</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Navigation tabs */}
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
              <button
                onClick={() => setActiveTab('perks')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'perks'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden sm:inline">Perk</span> Settings
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Account
              </button>
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
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Card Lookup, Assignment & Activation</h3>
              <div className="w-full">
                <SearchComponent
                  placeholder="Enter control number (e.g., MOC-01-NCR1-00001)"
                  suggestions={searchSuggestions}
                  onSearch={handleEnhancedSearch}
                  onResultSelect={handleSearchResultSelect}
                  onSuggestionSelect={handleSuggestionSelect}
                  isLoading={searchLoading || loading}
                  results={[]}
                  variant="default"
                  className="w-full"
                  showRecentSearches={true}
                />
              </div>
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
                    {foundCard.status === 'assigned' && (
                      <button
                        onClick={() => handleActivateCard(foundCard.id)}
                        className="bg-teal-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors self-start sm:self-auto"
                      >
                        Activate Card
                      </button>
                    )}

                    {foundCard.status === 'unassigned' && (
                      <button
                        onClick={() => handleAssignCard(foundCard.id)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 self-start sm:self-auto"
                      >
                        {loading ? 'Assigning...' : 'Assign to Clinic'}
                      </button>
                    )}

                    {foundCard.status === 'activated' && (
                      <span className="bg-green-100 text-green-600 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium self-start sm:self-auto">
                        ✅ Already Activated
                      </span>
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

        {activeTab === 'perks' && (
          <div className="space-y-6">
            <ClinicPerkCustomization
              clinicId={clinicCredentials.clinicId}
              clinicName={clinicCredentials.clinicName}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Account Information */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-500 mb-1">Clinic Name</label>
                  <div className="font-medium text-gray-900">{clinicCredentials.clinicName}</div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Clinic Code</label>
                  <div className="font-mono text-gray-900">{clinicCredentials.clinicCode}</div>
                </div>
              </div>
            </div>

            {/* Password Success Message */}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {passwordSuccess}
              </div>
            )}

            {/* Security Settings */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Security Settings</h3>
                {!showPasswordChange && (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="btn btn-outline text-sm px-4 py-2"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {showPasswordChange && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="input-field"
                        placeholder="Enter your current password"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="input-field"
                        placeholder="Enter your new password"
                        minLength={8}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Password must be at least 8 characters long
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="input-field"
                        placeholder="Confirm your new password"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Error Message */}
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{passwordError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="btn btn-primary flex items-center justify-center disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordError('');
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {!showPasswordChange && (
                <p className="text-sm text-gray-600">
                  Keep your account secure by using a strong, unique password.
                </p>
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

      {/* Auto-logout Warning Modal */}
      {showLogoutWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.866-.833-2.636 0L3.168 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Session Expiring Soon</h3>
              <p className="text-sm text-gray-600 mb-6">
                Your clinic session will expire in 5 minutes due to inactivity. Would you like to extend your session?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={extendSession}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Extend Session
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-gray-200 text-gray-900 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}