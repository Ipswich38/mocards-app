import { useState } from 'react';
import {
  Stethoscope, Users, Calendar, BarChart3, Settings, LogIn, User,
  Clock, CheckCircle, XCircle, Phone, Edit, Gift, Star, Award,
  ChevronRight, ExternalLink, Mail, Calendar as CalendarIcon,
  Edit3, Save, X, Trash2
} from 'lucide-react';
import { clinicOperations, cardOperations, type Clinic } from '../../lib/data';
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

// Mock perk redemption requests
interface PerkRedemption {
  id: string;
  cardControlNumber: string;
  patientName: string;
  perkType: string;
  perkDescription: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  clinicNotes?: string;
  processedAt?: string;
}

export function ClinicPortalView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);
  const [loginForm, setLoginForm] = useState({ code: '', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([
    {
      id: '1',
      cardControlNumber: 'MOC-00001-01-CVT001',
      patientName: 'Juan Dela Cruz',
      patientEmail: 'juan.delacruz@email.com',
      patientPhone: '+639171234567',
      preferredDate: '2024-12-25',
      preferredTime: '10:00',
      serviceType: 'Dental Cleaning',
      perkRequested: 'Free Dental Cleaning',
      status: 'pending',
      adminNotes: 'Patient prefers morning appointment',
      forwardedAt: '2024-12-19T08:00:00.000Z'
    },
    {
      id: '2',
      cardControlNumber: 'MOC-00002-NCR-CVT002',
      patientName: 'Maria Santos',
      patientEmail: 'maria.santos@email.com',
      patientPhone: '+639171234568',
      preferredDate: '2024-12-26',
      preferredTime: '14:00',
      serviceType: 'Consultation',
      perkRequested: 'Free Consultation',
      status: 'pending',
      adminNotes: 'Urgent case - patient experiencing pain',
      forwardedAt: '2024-12-19T09:00:00.000Z'
    }
  ]);
  const [perkRedemptions, setPerkRedemptions] = useState<PerkRedemption[]>([
    {
      id: '1',
      cardControlNumber: 'MOC-00001-01-CVT001',
      patientName: 'Juan Dela Cruz',
      perkType: 'dental_cleaning',
      perkDescription: 'Free Dental Cleaning Service',
      requestedAt: '2024-12-19T10:00:00.000Z',
      status: 'pending'
    },
    {
      id: '2',
      cardControlNumber: 'MOC-00003-4A-CVT003',
      patientName: 'Jose Rodriguez',
      perkType: 'consultation',
      perkDescription: 'Free Consultation',
      requestedAt: '2024-12-19T11:00:00.000Z',
      status: 'pending'
    }
  ]);

  // Edit state for limited CRUD functionality
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [editingPerk, setEditingPerk] = useState<string | null>(null);
  const [editAppointmentForm, setEditAppointmentForm] = useState({
    preferredDate: '',
    preferredTime: '',
    serviceType: '',
    clinicNotes: '',
    patientPhone: '',
    patientEmail: ''
  });
  const [editPerkForm, setEditPerkForm] = useState({
    perkDescription: '',
    clinicNotes: ''
  });

  const { addToast } = useToast();

  // Appointment Processing Handlers
  const handleAcceptAppointment = (appointmentId: string, notes?: string) => {
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

  const handleDeclineAppointment = (appointmentId: string, reason: string) => {
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

  // Perk Redemption Handlers
  const handleApprovePerkRedemption = (redemptionId: string, notes?: string) => {
    setPerkRedemptions(prev =>
      prev.map(perk =>
        perk.id === redemptionId
          ? {
              ...perk,
              status: 'approved',
              clinicNotes: notes || '',
              processedAt: new Date().toISOString()
            }
          : perk
      )
    );
    addToast(toastSuccess('Perk Approved', 'Redemption has been processed successfully'));
  };

  const handleDenyPerkRedemption = (redemptionId: string, reason: string) => {
    setPerkRedemptions(prev =>
      prev.map(perk =>
        perk.id === redemptionId
          ? {
              ...perk,
              status: 'denied',
              clinicNotes: reason,
              processedAt: new Date().toISOString()
            }
          : perk
      )
    );
    addToast(toastWarning('Perk Denied', 'Redemption request has been declined'));
  };

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

  const handleEditPerk = (perkId: string) => {
    const perk = perkRedemptions.find(p => p.id === perkId);
    if (perk) {
      setEditPerkForm({
        perkDescription: perk.perkDescription,
        clinicNotes: perk.clinicNotes || ''
      });
      setEditingPerk(perkId);
    }
  };

  const handleSavePerk = (perkId: string) => {
    setPerkRedemptions(prev =>
      prev.map(perk =>
        perk.id === perkId
          ? {
              ...perk,
              perkDescription: editPerkForm.perkDescription,
              clinicNotes: editPerkForm.clinicNotes
            }
          : perk
      )
    );
    setEditingPerk(null);
    addToast(toastSuccess('Perk Updated', 'Perk redemption details have been updated'));
  };

  const handleDeletePerk = (perkId: string) => {
    if (window.confirm('Are you sure you want to delete this perk redemption? This action cannot be undone.')) {
      setPerkRedemptions(prev => prev.filter(perk => perk.id !== perkId));
      addToast(toastSuccess('Perk Deleted', 'Perk redemption has been removed'));
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clinic = clinicOperations.authenticate(loginForm.code, loginForm.password);

    if (clinic) {
      setCurrentClinic(clinic);
      setIsAuthenticated(true);
      addToast(toastSuccess('Welcome', `Logged in to ${clinic.name}`));
    } else {
      addToast(toastError('Login Failed', 'Invalid clinic code or password'));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentClinic(null);
    setLoginForm({ code: '', password: '' });
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Code</label>
              <input
                type="text"
                value={loginForm.code}
                onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value })}
                className="light-input"
                placeholder="Enter clinic code (e.g., CVT001)"
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

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-gray-900 mb-2">Demo Credentials:</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>CVT001 / cvt001pass - Central Valley Clinic</p>
              <p>CVT002 / cvt002pass - Manila General Hospital</p>
              <p>CVT003 / cvt003pass - Laguna Medical Center</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentClinic) return null;

  const assignedCards = cardOperations.getByClinicId(currentClinic.id);
  const activeCards = assignedCards.filter(card => card.status === 'active');
  const planLimit = clinicOperations.getPlanLimit(currentClinic.id);
  const usagePercentage = (assignedCards.length / planLimit) * 100;
  const pendingAppointments = appointmentRequests.filter(apt => apt.status === 'pending');
  const pendingPerks = perkRedemptions.filter(perk => perk.status === 'pending');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'appointments', name: `Appointments (${pendingAppointments.length})`, icon: Calendar },
    { id: 'perks', name: `Perks (${pendingPerks.length})`, icon: Gift },
    { id: 'cards', name: 'Assigned Cards', icon: Users },
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
                  <p className="text-2xl font-bold text-gray-900">12</p>
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

            <div className="light-stat-card">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue (PHP)</p>
                  <p className="text-2xl font-bold text-gray-900">₱15,600</p>
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
                            onClick={() => {
                              const notes = prompt('Add any notes for the patient (optional):');
                              handleAcceptAppointment(request.id, notes || undefined);
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Please provide a reason for declining:');
                              if (reason) handleDeclineAppointment(request.id, reason);
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
              <h2 className="text-lg font-semibold text-gray-900">Perk Redemptions</h2>
              <span className="text-sm text-gray-600">
                {perkRedemptions.length} total requests
              </span>
            </div>

            {perkRedemptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Perk Redemptions</h3>
                <p className="text-gray-600">
                  No perk redemption requests have been submitted yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {perkRedemptions.map((redemption) => (
                  <div key={redemption.id} className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Gift className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{redemption.patientName}</h3>
                          <p className="text-sm text-gray-600">{redemption.cardControlNumber}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        redemption.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        redemption.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {redemption.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      {editingPerk === redemption.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Perk Description</label>
                            <input
                              type="text"
                              value={editPerkForm.perkDescription}
                              onChange={(e) => setEditPerkForm({ ...editPerkForm, perkDescription: e.target.value })}
                              className="light-input text-sm"
                            />
                          </div>
                          <p className="text-sm text-gray-600">Type: {redemption.perkType.replace('_', ' ')}</p>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-medium text-gray-900 mb-1">{redemption.perkDescription}</h4>
                          <p className="text-sm text-gray-600">Type: {redemption.perkType.replace('_', ' ')}</p>
                        </>
                      )}
                    </div>

                    {(redemption.clinicNotes || editingPerk === redemption.id) && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        {editingPerk === redemption.id ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Notes:</label>
                            <textarea
                              value={editPerkForm.clinicNotes}
                              onChange={(e) => setEditPerkForm({ ...editPerkForm, clinicNotes: e.target.value })}
                              placeholder="Add clinic notes..."
                              className="light-input text-sm resize-none"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">
                            <strong>Clinic Notes:</strong> {redemption.clinicNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {redemption.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              const notes = prompt('Add any notes about the redemption (optional):');
                              handleApprovePerkRedemption(redemption.id, notes || undefined);
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Please provide a reason for denying this redemption:');
                              if (reason) handleDenyPerkRedemption(redemption.id, reason);
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Deny</span>
                          </button>
                        </>
                      )}

                      {/* Limited CRUD - Edit & Delete for Clinic */}
                      {editingPerk === redemption.id ? (
                        <>
                          <button
                            onClick={() => handleSavePerk(redemption.id)}
                            className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Save changes"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingPerk(null)}
                            className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditPerk(redemption.id)}
                            className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Edit perk"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePerk(redemption.id)}
                            className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete perk"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-4">
                      Requested: {new Date(redemption.requestedAt).toLocaleString()}
                      {redemption.processedAt && (
                        <span> • Processed: {new Date(redemption.processedAt).toLocaleString()}</span>
                      )}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}