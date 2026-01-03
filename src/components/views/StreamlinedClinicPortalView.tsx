import { useState, useEffect } from 'react';
import { useLegacyAuth } from '../../features/authentication';
import {
  Stethoscope, Calendar, Settings, LogIn, User,
  CheckCircle, XCircle, Phone, Clock, Mail
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
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  adminNotes?: string;
  clinicNotes?: string;
  forwardedAt: string;
  processedAt?: string;
}

export function StreamlinedClinicPortalView() {
  const { isAuthenticated, login, logout } = useLegacyAuth();
  const [currentClinic, setCurrentClinic] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();

  // Load appointments
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
            status: apt.status as 'pending' | 'accepted' | 'declined' | 'completed',
            adminNotes: apt.notes,
            clinicNotes: '',
            forwardedAt: apt.createdAt,
            processedAt: undefined
          }));
          setAppointments(formattedAppointments);
        } catch (error) {
          console.error('Failed to load appointments:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadAppointments();
  }, [currentClinic]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simple clinic authentication
    if (loginForm.username && loginForm.password) {
      const clinic = {
        id: `clinic_${loginForm.username}`,
        name: `${loginForm.username} Dental Clinic`,
        code: loginForm.username.toUpperCase(),
        address: '123 Clinic Street',
        phone: '+63 XXX XXX XXXX'
      };
      setCurrentClinic(clinic);
      login('clinic', clinic);
      addToast(toastSuccess('Welcome', `Logged in to ${clinic.name}`));
    } else {
      addToast(toastWarning('Login Failed', 'Please enter valid credentials'));
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentClinic(null);
    setLoginForm({ username: '', password: '' });
    setAppointments([]);
  };

  const handleAcceptAppointment = async (appointmentId: string) => {
    const notes = prompt('Add any notes for the patient (optional):');
    try {
      await appointmentOperations.updateStatus(appointmentId, 'accepted');
      setAppointments(prev =>
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
      addToast(toastSuccess('Appointment Accepted', 'Patient will be notified'));
    } catch (error) {
      addToast(toastWarning('Error', 'Failed to accept appointment'));
    }
  };

  const handleDeclineAppointment = async (appointmentId: string) => {
    const reason = prompt('Please provide a reason for declining:');
    if (!reason) return;

    try {
      await appointmentOperations.updateStatus(appointmentId, 'declined');
      setAppointments(prev =>
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
      addToast(toastWarning('Appointment Declined', 'Patient will be notified'));
    } catch (error) {
      addToast(toastWarning('Error', 'Failed to decline appointment'));
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Clinic Portal</h1>
            <p className="text-gray-600">Login to manage your appointment requests</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Code</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="light-input"
                placeholder="Enter your clinic code"
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
                placeholder="Enter your password"
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

  // Loading Screen
  if (!currentClinic || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="h-8 w-8 text-blue-600" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Clinic Portal</h2>
          <p className="text-gray-600">Loading your appointment requests...</p>
        </div>
      </div>
    );
  }

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
  const processedAppointments = appointments.filter(apt => apt.status !== 'pending');

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
                <p className="text-sm text-gray-600">{currentClinic.address} • {currentClinic.phone}</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="light-card p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{pendingAppointments.length}</p>
              <p className="text-sm text-gray-600">Pending Requests</p>
            </div>
          </div>
        </div>

        <div className="light-card p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {processedAppointments.filter(a => a.status === 'accepted').length}
              </p>
              <p className="text-sm text-gray-600">Accepted</p>
            </div>
          </div>
        </div>

        <div className="light-card p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              <p className="text-sm text-gray-600">Total Requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Appointments */}
      {pendingAppointments.length > 0 && (
        <div className="light-card mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              Pending Appointment Requests ({pendingAppointments.length})
            </h2>

            <div className="space-y-4">
              {pendingAppointments.map((request) => (
                <div key={request.id} className="border border-yellow-200 rounded-xl p-6 bg-yellow-50">
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
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      {request.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{new Date(request.preferredDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium">{request.preferredTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Service</p>
                      <p className="font-medium">{request.serviceType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{request.patientPhone}</p>
                    </div>
                  </div>

                  {request.adminNotes && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Admin Notes:</strong> {request.adminNotes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptAppointment(request.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleDeclineAppointment(request.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Decline</span>
                    </button>
                    <a
                      href={`tel:${request.patientPhone}`}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`mailto:${request.patientEmail}`}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </a>
                  </div>

                  <div className="text-xs text-gray-500 mt-4">
                    Forwarded: {new Date(request.forwardedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Processed Appointments */}
      {processedAppointments.length > 0 && (
        <div className="light-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Processed Appointments ({processedAppointments.length})
            </h2>

            <div className="space-y-3">
              {processedAppointments.slice(0, 5).map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{request.patientName}</p>
                        <p className="text-sm text-gray-600">{request.serviceType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.processedAt && new Date(request.processedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {request.clinicNotes && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Notes:</strong> {request.clinicNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {appointments.length === 0 && (
        <div className="light-card">
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Yet</h3>
            <p className="text-gray-600">
              No appointment requests have been forwarded to your clinic.
              <br />
              When patients request appointments, they will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}