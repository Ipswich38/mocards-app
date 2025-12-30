import { useState, useEffect } from 'react';
import { useLegacyAuth } from '../../features/authentication';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  Stethoscope, Users, Calendar, BarChart3, Settings, LogIn, User,
  Clock, CheckCircle, XCircle, Phone, Gift, Calendar as CalendarIcon,
  Edit3, Save, X, Trash2, Award
} from 'lucide-react';
import { clinicOperations, cardOperations, perkOperations, appointmentOperations, perkRedemptionOperations, type Clinic, type Perk, type PerkRedemption as RealPerkRedemption } from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastError, toastWarning } from '../../lib/toast';

// Mock appointment requests forwarded from admin
interface AppointmentRequest {
  id: string;
  cardControlNumber: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: string;
  perkRequested: string;
  status: 'pending' | 'accepted' | 'declined' | 'rescheduled';
  adminNotes?: string;
  clinicNotes?: string;
  forwardedAt: string;
  processedAt?: string;
}

// Using real perk redemption data from database - imported from data.ts as RealPerkRedemption

export function ClinicPortalView() {
  const { isAuthenticated, user, login, logout } = useLegacyAuth();
  useAutoRefresh({ enabled: true, showNotifications: true });
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPerkRedemptionModal, setShowPerkRedemptionModal] = useState(false);
  const [selectedCardForPerk, setSelectedCardForPerk] = useState<string | null>(null);
  const [selectedPerkId, setSelectedPerkId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  // Real appointment state - loads from database
  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([]);
  // Real perk redemptions state - loads from database
  const [perkRedemptions, setPerkRedemptions] = useState<RealPerkRedemption[]>([]);
  // Selected card for viewing history
  const [selectedCardForHistory, setSelectedCardForHistory] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Cards data state for async operations
  const [clinicCards, setClinicCards] = useState<any[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [planLimit, setPlanLimit] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Edit state for limited CRUD functionality
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [editAppointmentForm, setEditAppointmentForm] = useState({
    preferredDate: '',
    preferredTime: '',
    serviceType: '',
    clinicNotes: '',
    patientPhone: '',
    patientEmail: ''
  });

  // Password Management State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  const { addToast } = useToast();

  // Restore clinic session on mount
  useEffect(() => {
    const loadClinic = async () => {
      if (isAuthenticated && user && user.type === 'clinic' && user.clinicId && !currentClinic) {
        try {
          const clinic = await clinicOperations.getById(user.clinicId);
          if (clinic) {
            setCurrentClinic(clinic);
          } else {
            console.error('Clinic not found for ID:', user.clinicId);
          }
        } catch (error) {
          console.error('Failed to load clinic:', error);
        }
      }
    };

    loadClinic();
  }, [isAuthenticated, user, currentClinic]);

  // Load real appointments, perk redemptions, and clinic cards
  useEffect(() => {
    const loadClinicData = async () => {
      if (currentClinic) {
        try {
          setLoading(true);

          // Load appointments
          const realAppointments = await appointmentOperations.getByClinicId(currentClinic.id);
          // Convert to the AppointmentRequest format used by the UI
          const formattedAppointments: AppointmentRequest[] = realAppointments.map(apt => ({
            id: apt.id,
            cardControlNumber: apt.cardControlNumber,
            patientName: apt.patientName,
            patientEmail: apt.patientEmail,
            patientPhone: apt.patientPhone,
            preferredDate: apt.preferredDate,
            preferredTime: apt.preferredTime,
            serviceType: apt.serviceType,
            perkRequested: apt.perkRequested || '',
            status: apt.status as 'pending' | 'accepted' | 'declined' | 'rescheduled',
            adminNotes: apt.notes,
            clinicNotes: '',
            forwardedAt: apt.createdAt,
            processedAt: undefined
          }));
          setAppointmentRequests(formattedAppointments);

          // Load perk redemptions for this clinic
          const realRedemptions = await perkRedemptionOperations.getByClinicId(currentClinic.id);
          setPerkRedemptions(realRedemptions);

          // Load clinic cards
          const cards = await cardOperations.getByClinicId(currentClinic.id);
          setClinicCards(cards);

          // Load perks
          const perksData = await perkOperations.getAll();
          setPerks(perksData);

          // Calculate plan limit
          const limit = await clinicOperations.getPlanLimit(currentClinic.id);
          setPlanLimit(limit);

        } catch (error) {
          console.error('Failed to load clinic data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadClinicData();
  }, [currentClinic]);

  // Appointment Processing Handlers
  const handleAcceptAppointment = async (appointmentId: string, notes?: string) => {
    // Update in database
    await appointmentOperations.updateStatus(appointmentId, 'accepted');

    // Update local state
    setAppointmentRequests(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? {
              ...apt,
              status: 'accepted',
              clinicNotes: notes || '',
              processedAt: new Date().toISOString()
            }
          : apt
      )
    );
    addToast(toastSuccess('Appointment Accepted', 'Patient will be notified of the confirmation'));
  };

  const handleDeclineAppointment = async (appointmentId: string, reason: string) => {
    // Update in database
    await appointmentOperations.updateStatus(appointmentId, 'declined');

    // Update local state
    setAppointmentRequests(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? {
              ...apt,
              status: 'declined',
              clinicNotes: reason,
              processedAt: new Date().toISOString()
            }
          : apt
      )
    );
    addToast(toastWarning('Appointment Declined', 'Patient will be notified with the reason'));
  };

  const handleRescheduleAppointment = (appointmentId: string, newDate: string, newTime: string, notes?: string) => {
    setAppointmentRequests(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? {
              ...apt,
              status: 'rescheduled',
              preferredDate: newDate,
              preferredTime: newTime,
              clinicNotes: notes || 'Rescheduled by clinic',
              processedAt: new Date().toISOString()
            }
          : apt
      )
    );
    addToast(toastSuccess('Appointment Rescheduled', 'Patient will be contacted with new schedule'));
  };

  // Legacy perk management removed - now using real-time redemption system

  // Limited CRUD Handlers for Clinic (Appointments & Perks only)
  const handleEditAppointment = (appointmentId: string) => {
    const appointment = appointmentRequests.find(apt => apt.id === appointmentId);
    if (appointment) {
      setEditAppointmentForm({
        preferredDate: appointment.preferredDate,
        preferredTime: appointment.preferredTime,
        serviceType: appointment.serviceType,
        clinicNotes: appointment.clinicNotes || '',
        patientPhone: appointment.patientPhone,
        patientEmail: appointment.patientEmail
      });
      setEditingAppointment(appointmentId);
    }
  };

  const handleSaveAppointment = (appointmentId: string) => {
    setAppointmentRequests(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? {
              ...apt,
              preferredDate: editAppointmentForm.preferredDate,
              preferredTime: editAppointmentForm.preferredTime,
              serviceType: editAppointmentForm.serviceType,
              clinicNotes: editAppointmentForm.clinicNotes,
              patientPhone: editAppointmentForm.patientPhone,
              patientEmail: editAppointmentForm.patientEmail
            }
          : apt
      )
    );
    setEditingAppointment(null);
    addToast(toastSuccess('Appointment Updated', 'Appointment details have been updated'));
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    if (window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      setAppointmentRequests(prev => prev.filter(apt => apt.id !== appointmentId));
      addToast(toastSuccess('Appointment Deleted', 'Appointment has been removed'));
    }
  };

  // Legacy perk CRUD removed - using real tracking system

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clinic = await clinicOperations.authenticate(loginForm.username, loginForm.password);

    if (clinic) {
      setCurrentClinic(clinic);
      login('clinic', clinic);
      addToast(toastSuccess('Welcome', `Logged in to ${clinic.name}`));
    } else {
      addToast(toastError('Login Failed', 'Invalid clinic code or password'));
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentClinic(null);
    setLoginForm({ username: '', password: '' });
  };

  // Password Change Handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentClinic) return;

    if (passwordChangeForm.currentPassword !== currentClinic.password) {
      addToast(toastError('Invalid Password', 'Current password is incorrect'));
      return;
    }

    if (passwordChangeForm.newPassword.length < 8) {
      addToast(toastError('Password Too Short', 'New password must be at least 8 characters long'));
      return;
    }

    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      addToast(toastError('Passwords Do Not Match', 'Please confirm your new password correctly'));
      return;
    }

    // Update clinic password
    const updatedClinic = { ...currentClinic, password: passwordChangeForm.newPassword };
    await clinicOperations.update(currentClinic.id, { password: passwordChangeForm.newPassword });
    setCurrentClinic(updatedClinic);

    setPasswordChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordChange(false);
    addToast(toastSuccess('Password Changed', 'Your clinic password has been updated successfully'));
  };

  // Perk Redemption Handler with real tracking
  const handlePerkRedemption = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCardForPerk || !selectedPerkId || !currentClinic) return;

    const card = clinicCards.find(c => c.controlNumber === selectedCardForPerk);
    const perk = perks.find(p => p.id === selectedPerkId);

    if (!card || !perk) {
      addToast(toastError('Error', 'Card or perk not found'));
      return;
    }

    if (card.perksUsed >= card.perksTotal) {
      addToast(toastError('No Perks Available', 'This card has no available perks to redeem'));
      return;
    }

    // Get required information for tracking
    const claimantName = prompt('Patient name (claimant):');
    const handledBy = prompt('Staff member handling this redemption:');
    const serviceType = prompt('Service type provided:');
    const notes = prompt('Additional notes (optional):');

    if (!claimantName || !handledBy || !serviceType) {
      addToast(toastError('Missing Information', 'Please provide all required details for tracking'));
      return;
    }

    // Create perk redemption record
    const redemption = await perkRedemptionOperations.create({
      cardControlNumber: selectedCardForPerk,
      perkId: selectedPerkId,
      perkName: perk.name,
      clinicId: currentClinic.id,
      claimantName,
      handledBy,
      serviceType,
      usedAt: new Date().toISOString(),
      value: perk.value || 0,
      notes: notes || undefined
    });

    // Update card perks count
    await cardOperations.updatePerks(selectedCardForPerk, card.perksUsed + 1);

    // Update local perk redemptions list
    setPerkRedemptions(prev => [...prev, redemption]);

    // Close modal and reset form
    setShowPerkRedemptionModal(false);
    setSelectedCardForPerk(null);
    setSelectedPerkId('');

    addToast(toastSuccess('Perk Redeemed', `${perk.name} has been successfully redeemed and tracked for ${claimantName}`));
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Clinic Portal Login</h1>
            <p className="text-gray-600">Please authenticate with your clinic credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="light-input"
                placeholder="Enter clinic username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="light-input"
                placeholder="Enter clinic password"
                required
              />
            </div>
            <button type="submit" className="light-button-primary w-full flex items-center justify-center">
              <LogIn className="h-4 w-4 mr-2" />
              Access Clinic Portal
            </button>
          </form>


        </div>
      </div>
    );
  }

  if (!currentClinic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Clinic Portal</h2>
          <p className="text-gray-600">Please wait while we load your clinic information...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Clinic Data</h2>
          <p className="text-gray-600">Please wait while we load your cards, appointments, and redemption history...</p>
        </div>
      </div>
    );
  }

  const assignedCards = clinicCards;
  const activeCards = assignedCards.filter(card => card.status === 'active');
  const usagePercentage = planLimit > 0 ? (assignedCards.length / planLimit) * 100 : 0;
  const pendingAppointments = appointmentRequests.filter(apt => apt.status === 'pending');
  const pendingPerks: RealPerkRedemption[] = []; // No pending system for real redemptions - they are immediate

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'appointments', name: `Appointments (${pendingAppointments.length})`, icon: Calendar },
    { id: 'perks', name: `Perk History`, icon: Gift },
    { id: 'cards', name: 'Assigned Cards', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentClinic.name}</h1>
                <p className="text-gray-600">{currentClinic.address} • {currentClinic.code}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="light-button-secondary flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="light-card mb-6">
        <div className="p-2">
          <div className="flex space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Subscription Status */}
          <div className="light-card mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Subscription Status</h2>
                <span className={`plan-${currentClinic.plan} capitalize`}>
                  {currentClinic.plan} Plan
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cards Assigned</span>
                  <span className="font-medium">{assignedCards.length} / {planLimit}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      usagePercentage > 90 ? 'bg-red-500' :
                      usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{assignedCards.length}</p>
                    <p className="text-xs text-gray-600">Total Cards</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{activeCards.length}</p>
                    <p className="text-xs text-gray-600">Active Cards</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-400">{assignedCards.length - activeCards.length}</p>
                    <p className="text-xs text-gray-600">Inactive Cards</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="light-stat-card">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{appointmentRequests.filter(apt =>
                    new Date(apt.preferredDate).toDateString() === new Date().toDateString()
                  ).length}</p>
                </div>
              </div>
            </div>

            <div className="light-stat-card">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingAppointments.length}</p>
                </div>
              </div>
            </div>

            <div className="light-stat-card">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Gift className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Perks</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingPerks.length}</p>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {activeTab === 'appointments' && (
        <div className="light-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Appointment Requests</h2>
              <span className="text-sm text-gray-600">
                {appointmentRequests.length} total requests
              </span>
            </div>

            {appointmentRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointment Requests</h3>
                <p className="text-gray-600">
                  No appointment requests have been forwarded to your clinic yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointmentRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{request.patientName}</h3>
                          <p className="text-sm text-gray-600">{request.cardControlNumber}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        request.status === 'declined' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Preferred Date</p>
                        {editingAppointment === request.id ? (
                          <input
                            type="date"
                            value={editAppointmentForm.preferredDate}
                            onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, preferredDate: e.target.value })}
                            className="light-input text-sm mt-1"
                          />
                        ) : (
                          <p className="font-medium">{new Date(request.preferredDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Preferred Time</p>
                        {editingAppointment === request.id ? (
                          <input
                            type="time"
                            value={editAppointmentForm.preferredTime}
                            onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, preferredTime: e.target.value })}
                            className="light-input text-sm mt-1"
                          />
                        ) : (
                          <p className="font-medium">{request.preferredTime}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Service</p>
                        {editingAppointment === request.id ? (
                          <input
                            type="text"
                            value={editAppointmentForm.serviceType}
                            onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, serviceType: e.target.value })}
                            className="light-input text-sm mt-1"
                          />
                        ) : (
                          <p className="font-medium">{request.serviceType}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Contact</p>
                        {editingAppointment === request.id ? (
                          <input
                            type="tel"
                            value={editAppointmentForm.patientPhone}
                            onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, patientPhone: e.target.value })}
                            className="light-input text-sm mt-1"
                          />
                        ) : (
                          <p className="font-medium">{request.patientPhone}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        {editingAppointment === request.id ? (
                          <input
                            type="email"
                            value={editAppointmentForm.patientEmail}
                            onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, patientEmail: e.target.value })}
                            className="light-input text-sm mt-1"
                          />
                        ) : (
                          <p className="font-medium">{request.patientEmail}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Perk</p>
                        <p className="font-medium">{request.perkRequested}</p>
                      </div>
                    </div>

                    {request.adminNotes && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-blue-800">
                          <strong>Admin Notes:</strong> {request.adminNotes}
                        </p>
                      </div>
                    )}

                    {(request.clinicNotes || editingAppointment === request.id) && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        {editingAppointment === request.id ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Notes:</label>
                            <textarea
                              value={editAppointmentForm.clinicNotes}
                              onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, clinicNotes: e.target.value })}
                              placeholder="Add clinic notes..."
                              className="light-input text-sm resize-none"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">
                            <strong>Clinic Notes:</strong> {request.clinicNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={async () => {
                              const notes = prompt('Add any notes for the patient (optional):');
                              await handleAcceptAppointment(request.id, notes || undefined);
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt('Please provide a reason for declining:');
                              if (reason) await handleDeclineAppointment(request.id, reason);
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Decline</span>
                          </button>
                          <button
                            onClick={() => {
                              const newDate = prompt('New preferred date (YYYY-MM-DD):');
                              const newTime = prompt('New preferred time (HH:MM):');
                              const notes = prompt('Notes for the patient:');
                              if (newDate && newTime) {
                                handleRescheduleAppointment(request.id, newDate, newTime, notes || undefined);
                              }
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <CalendarIcon className="h-4 w-4" />
                            <span>Reschedule</span>
                          </button>
                          <a
                            href={`tel:${request.patientPhone}`}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            <span>Call Patient</span>
                          </a>
                        </>
                      )}

                      {/* Limited CRUD - Edit & Delete for Clinic */}
                      {editingAppointment === request.id ? (
                        <>
                          <button
                            onClick={() => handleSaveAppointment(request.id)}
                            className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Save changes"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingAppointment(null)}
                            className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditAppointment(request.id)}
                            className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Edit appointment"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(request.id)}
                            className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete appointment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-4">
                      Forwarded: {new Date(request.forwardedAt).toLocaleString()}
                      {request.processedAt && (
                        <span> • Processed: {new Date(request.processedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'perks' && (
        <div className="light-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Perk Redemption History</h2>
              <span className="text-sm text-gray-600">
                {perkRedemptions.length} total redemptions
              </span>
            </div>

            {perkRedemptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Perk Redemptions</h3>
                <p className="text-gray-600">
                  No perks have been redeemed at this clinic yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {perkRedemptions.map((redemption) => (
                  <div key={redemption.id} className="border border-gray-200 rounded-xl p-6 bg-green-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Gift className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{redemption.claimantName}</h3>
                          <p className="text-sm text-gray-600">{redemption.cardControlNumber}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Redeemed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-600 font-medium">Perk:</span>
                        <p className="text-gray-900 mt-1">{redemption.perkName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Service Type:</span>
                        <p className="text-gray-900 mt-1">{redemption.serviceType}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Handled By:</span>
                        <p className="text-gray-900 mt-1">{redemption.handledBy}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Value:</span>
                        <p className="text-gray-900 mt-1">₱{redemption.value.toFixed(2)}</p>
                      </div>
                    </div>

                    {redemption.notes && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-4">
                        <span className="text-blue-800 font-medium text-sm">Notes:</span>
                        <p className="text-blue-700 text-sm mt-1">{redemption.notes}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-4">
                      Redeemed: {new Date(redemption.usedAt).toLocaleString('en-PH')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="light-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Assigned Cards</h2>
              <span className="text-sm text-gray-600">
                {assignedCards.length} cards assigned to this clinic
              </span>
            </div>

            {assignedCards.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Cards Assigned</h3>
                <p className="text-gray-600">
                  No MOC cards have been assigned to your clinic yet. Contact the administrator to get cards assigned.
                </p>
              </div>
            ) : (
              <div className="light-table">
                <table className="w-full">
                  <thead className="light-table-header">
                    <tr>
                      <th className="text-left p-4">Control Number</th>
                      <th className="text-left p-4">Patient Name</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Perks Available</th>
                      <th className="text-left p-4">Expiry</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedCards.map((card) => (
                      <tr key={card.controlNumber} className="light-table-row">
                        <td className="p-4 font-mono text-sm">{card.controlNumber}</td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                            <span className="font-medium">{card.fullName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={card.status === 'active' ? 'status-active' : 'status-inactive'}>
                            {card.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${((card.perksTotal - card.perksUsed) / card.perksTotal) * 100}%`
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {card.perksTotal - card.perksUsed}/{card.perksTotal}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{new Date(card.expiryDate).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedCardForPerk(card.controlNumber);
                                setShowPerkRedemptionModal(true);
                              }}
                              disabled={card.perksUsed >= card.perksTotal}
                              className="btn-primary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Award className="h-4 w-4 mr-1" />
                              Redeem Perk
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCardForHistory(card.controlNumber);
                                setShowHistoryModal(true);
                              }}
                              className="light-button-secondary text-sm px-3 py-1"
                              title="View perk redemption history"
                            >
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="light-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Clinic Settings</h2>

            {/* Password Change Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Password Management</h3>
                  <p className="text-sm text-gray-600">Change your clinic password for security</p>
                </div>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="light-button-primary"
                >
                  Change Password
                </button>
              </div>

              {showPasswordChange && (
                <div className="border-t border-gray-200 pt-4">
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordChangeForm.currentPassword}
                        onChange={(e) => setPasswordChangeForm({
                          ...passwordChangeForm,
                          currentPassword: e.target.value
                        })}
                        className="light-input"
                        placeholder="Enter current password"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordChangeForm.newPassword}
                        onChange={(e) => setPasswordChangeForm({
                          ...passwordChangeForm,
                          newPassword: e.target.value
                        })}
                        className="light-input"
                        placeholder="Enter new password (min 8 characters)"
                        minLength={8}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordChangeForm.confirmPassword}
                        onChange={(e) => setPasswordChangeForm({
                          ...passwordChangeForm,
                          confirmPassword: e.target.value
                        })}
                        className="light-input"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" className="light-button-primary">
                        Update Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordChangeForm({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                        }}
                        className="light-button-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Clinic Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Clinic Name:</span>
                  <span className="ml-2 text-gray-600">{currentClinic.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Clinic Code:</span>
                  <span className="ml-2 text-gray-600">{currentClinic.code}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Plan:</span>
                  <span className="ml-2 text-gray-600 capitalize">{currentClinic.plan}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Region:</span>
                  <span className="ml-2 text-gray-600">{currentClinic.region}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-600">{currentClinic.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Contact:</span>
                  <span className="ml-2 text-gray-600">{currentClinic.contactNumber}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Address:</span>
                  <span className="ml-2 text-gray-600">{currentClinic.address}</span>
                </div>
              </div>
            </div>

            {/* Support Information */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Support</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Need Help?</strong> Contact MOCARDS support at{' '}
                  <a href="mailto:admin@mocards.cloud" className="text-blue-600 hover:text-blue-700">
                    admin@mocards.cloud
                  </a>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  For password reset assistance, please include your clinic code and name in your message.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Perk Redemption Modal */}
      {showPerkRedemptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Redeem Perk</h3>
                <button
                  onClick={() => {
                    setShowPerkRedemptionModal(false);
                    setSelectedCardForPerk(null);
                    setSelectedPerkId('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handlePerkRedemption} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Control Number
                  </label>
                  <input
                    type="text"
                    value={selectedCardForPerk || ''}
                    disabled
                    className="light-input bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Perk to Redeem
                  </label>
                  <select
                    value={selectedPerkId}
                    onChange={(e) => setSelectedPerkId(e.target.value)}
                    className="light-select"
                    required
                  >
                    <option value="">Choose a perk...</option>
                    {perks.filter(p => p.isActive).map((perk) => (
                      <option key={perk.id} value={perk.id}>
                        {perk.name} - {perk.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={!selectedPerkId}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Redeem Perk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPerkRedemptionModal(false);
                      setSelectedCardForPerk(null);
                      setSelectedPerkId('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Perk Redemption History Modal */}
      {showHistoryModal && selectedCardForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Perk Redemption History</h3>
                  <p className="text-sm text-gray-600">Card: {selectedCardForHistory}</p>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedCardForHistory(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {(() => {
                const cardHistory = perkRedemptions.filter(redemption => redemption.cardControlNumber === selectedCardForHistory);
                if (cardHistory.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Gift className="h-8 w-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Redemption History</h4>
                      <p className="text-gray-600">
                        This card has not been used to redeem any perks yet.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {cardHistory.map((redemption, index) => (
                      <div key={redemption.id} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 font-bold text-sm">#{cardHistory.length - index}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{redemption.perkName}</h4>
                              <p className="text-sm text-gray-600">Service: {redemption.serviceType}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(redemption.usedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(redemption.usedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 font-medium">Claimant Name:</span>
                            <p className="text-gray-900 mt-1">{redemption.claimantName}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Handled By:</span>
                            <p className="text-gray-900 mt-1">{redemption.handledBy}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Value:</span>
                            <p className="text-gray-900 mt-1">₱{redemption.value.toFixed(2)}</p>
                          </div>
                        </div>

                        {redemption.notes && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <span className="text-blue-800 font-medium text-sm">Notes:</span>
                            <p className="text-blue-700 text-sm mt-1">{redemption.notes}</p>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Redeemed on {new Date(redemption.usedAt).toLocaleDateString('en-PH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Total Redemptions: {cardHistory.length}</span>
                      </div>
                      <p className="text-sm text-blue-700 mt-2">
                        This record provides proof of perk usage to prevent misuse and duplicate claims.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}