import { useState, useEffect } from 'react';
import { useLegacyAuth } from '../../features/authentication';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  Stethoscope, Calendar, Settings, LogIn, User,
  CheckCircle, XCircle, Phone
} from 'lucide-react';
import { appointmentOperations } from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning } from '../../lib/toast';

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

export function SimpleClinicPortalView() {
  const { isAuthenticated, login, logout } = useLegacyAuth();
  useAutoRefresh({ enabled: true, showNotifications: true });
  const [currentClinic, setCurrentClinic] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();

  // Load appointments only
  useEffect(() => {
    const loadAppointments = async () => {
      if (currentClinic) {
        try {
          setLoading(true);
          const realAppointments = await appointmentOperations.getByClinicId(currentClinic.id);
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
        } catch (error) {
          console.error('Failed to load appointment data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadAppointments();
  }, [currentClinic]);

  const handleAcceptAppointment = async (appointmentId: string, notes?: string) => {
    await appointmentOperations.updateStatus(appointmentId, 'accepted');
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
    await appointmentOperations.updateStatus(appointmentId, 'declined');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simple clinic authentication - replace with your actual auth logic
    const clinic = { id: 'clinic1', name: 'Sample Clinic', code: loginForm.username };
    if (loginForm.username && loginForm.password) {
      setCurrentClinic(clinic);
      login('clinic', clinic);
      addToast(toastSuccess('Welcome', `Logged in to ${clinic.name}`));
    } else {
      addToast(toastWarning('Login Failed', 'Invalid clinic code or password'));
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentClinic(null);
    setLoginForm({ username: '', password: '' });
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

  if (!currentClinic || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Clinic Data</h2>
          <p className="text-gray-600">Please wait while we load your appointment requests...</p>
        </div>
      </div>
    );
  }

  const pendingAppointments = appointmentRequests.filter(apt => apt.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-0">
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
                <p className="text-sm text-gray-600">Clinic Portal - Appointment Management</p>
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

      {/* Appointment Requests */}
      <div className="light-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Appointment Requests
            </h2>
            <span className="text-sm text-gray-600">
              {pendingAppointments.length} pending requests
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
                      <p className="font-medium">{new Date(request.preferredDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preferred Time</p>
                      <p className="font-medium">{request.preferredTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Service</p>
                      <p className="font-medium">{request.serviceType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact</p>
                      <p className="font-medium">{request.patientPhone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{request.patientEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Perk Requested</p>
                      <p className="font-medium">{request.perkRequested || 'None'}</p>
                    </div>
                  </div>

                  {request.adminNotes && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Admin Notes:</strong> {request.adminNotes}
                      </p>
                    </div>
                  )}

                  {request.clinicNotes && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>Clinic Notes:</strong> {request.clinicNotes}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
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
                      <a
                        href={`tel:${request.patientPhone}`}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Call Patient</span>
                      </a>
                    </div>
                  )}

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
    </div>
  );
}