import { useState, useEffect } from 'react';
import { streamlinedOps, Clinic } from '../lib/streamlined-operations';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Clock,
  User,
  Phone,
  Mail,
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  Users,
} from 'lucide-react';

interface AppointmentCalendarProps {
  token: string | null;
}

interface Appointment {
  id: string;
  clinic_id: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AppointmentWithClinic extends Appointment {
  clinic: Clinic;
}

const APPOINTMENT_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00'
];

const SERVICE_TYPES = [
  'Consultation', 'Cleaning', 'X-Ray', 'Filling', 'Extraction',
  'Root Canal', 'Crown/Bridge', 'Whitening', 'Orthodontics',
  'Oral Surgery', 'Emergency', 'Follow-up'
];

export function AppointmentCalendar({ }: AppointmentCalendarProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Data state
  const [appointments, setAppointments] = useState<AppointmentWithClinic[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithClinic[]>([]);

  // Filter state
  const [clinicFilter, setClinicFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form state
  const [appointmentForm, setAppointmentForm] = useState({
    clinic_id: '',
    patient_name: '',
    patient_email: '',
    patient_phone: '',
    appointment_date: '',
    appointment_time: '',
    service_type: '',
    status: 'scheduled' as const,
    notes: '',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    loadAppointmentData();
  }, [currentDate, clinicFilter, statusFilter, serviceFilter]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchQuery, clinicFilter, statusFilter, serviceFilter]);

  const loadAppointmentData = async () => {
    setLoading(true);
    try {
      // In a real app, this would be actual API calls
      // For now, we'll simulate with mock data
      const clinicsData = await streamlinedOps.getAllClinics();
      setClinics(clinicsData);

      // Mock appointment data
      const mockAppointments: AppointmentWithClinic[] = [
        {
          id: '1',
          clinic_id: clinicsData[0]?.id || '',
          patient_name: 'John Doe',
          patient_email: 'john@example.com',
          patient_phone: '+63 912 345 6789',
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '09:00',
          service_type: 'Consultation',
          status: 'scheduled',
          notes: 'First time patient',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          clinic: clinicsData[0] || {} as Clinic,
        },
        {
          id: '2',
          clinic_id: clinicsData[0]?.id || '',
          patient_name: 'Jane Smith',
          patient_email: 'jane@example.com',
          patient_phone: '+63 912 345 6790',
          appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          appointment_time: '14:30',
          service_type: 'Cleaning',
          status: 'confirmed',
          notes: 'Regular cleaning appointment',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          clinic: clinicsData[0] || {} as Clinic,
        },
        // Add more mock appointments as needed
      ];

      setAppointments(mockAppointments);

      // Calculate stats
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6);

      const statsData = {
        total: mockAppointments.length,
        today: mockAppointments.filter(a => a.appointment_date === today).length,
        thisWeek: mockAppointments.filter(a => {
          const appointmentDate = new Date(a.appointment_date);
          return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
        }).length,
        scheduled: mockAppointments.filter(a => a.status === 'scheduled').length,
        confirmed: mockAppointments.filter(a => a.status === 'confirmed').length,
        completed: mockAppointments.filter(a => a.status === 'completed').length,
        cancelled: mockAppointments.filter(a => a.status === 'cancelled').length,
      };
      setStats(statsData);

    } catch (err: any) {
      setError(err.message || 'Failed to load appointment data');
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;

    if (searchQuery) {
      filtered = filtered.filter(appointment =>
        appointment.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.patient_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.service_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (clinicFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.clinic_id === clinicFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    if (serviceFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.service_type === serviceFilter);
    }

    setFilteredAppointments(filtered);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real app, this would be an API call
      const newAppointment: AppointmentWithClinic = {
        id: Date.now().toString(),
        ...appointmentForm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        clinic: clinics.find(c => c.id === appointmentForm.clinic_id) || {} as Clinic,
      };

      setAppointments(prev => [...prev, newAppointment]);
      setSuccess('Appointment created successfully');
      setShowAppointmentModal(false);
      resetAppointmentForm();

    } catch (err: any) {
      setError(err.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      setAppointments(prev =>
        prev.map(appointment =>
          appointment.id === appointmentId
            ? { ...appointment, status: newStatus, updated_at: new Date().toISOString() }
            : appointment
        )
      );
      setSuccess(`Appointment ${newStatus} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment');
    }
  };

  const resetAppointmentForm = () => {
    setAppointmentForm({
      clinic_id: '',
      patient_name: '',
      patient_email: '',
      patient_phone: '',
      appointment_date: '',
      appointment_time: '',
      service_type: '',
      status: 'scheduled',
      notes: '',
    });
    setEditingAppointment(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'no_show': return <AlertCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportAppointments = () => {
    const csvContent = [
      ['Date', 'Time', 'Patient', 'Email', 'Phone', 'Service', 'Status', 'Clinic', 'Notes'].join(','),
      ...filteredAppointments.map(appointment => [
        appointment.appointment_date,
        appointment.appointment_time,
        appointment.patient_name,
        appointment.patient_email || '',
        appointment.patient_phone || '',
        appointment.service_type,
        appointment.status,
        appointment.clinic.clinic_name,
        appointment.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-lg font-semibold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-lg font-semibold text-gray-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-lg font-semibold text-gray-900">{stats.scheduled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Confirmed</p>
              <p className="text-lg font-semibold text-gray-900">{stats.confirmed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-lg font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-lg font-semibold text-gray-900">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Calendar Navigation */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Today
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              {['month', 'week', 'day'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-sm rounded capitalize ${
                    viewMode === mode
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={exportAppointments}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              <button
                onClick={() => setShowAppointmentModal(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clinics</option>
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.clinic_name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Services</option>
              {SERVICE_TYPES.map(service => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-500 flex items-center">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No appointments found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">{appointment.appointment_time}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900">{appointment.patient_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {appointment.patient_email && (
                          <div className="flex items-center mb-1">
                            <Mail className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs">{appointment.patient_email}</span>
                          </div>
                        )}
                        {appointment.patient_phone && (
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs">{appointment.patient_phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.service_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">{appointment.clinic.clinic_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusIcon(appointment.status)}
                        <span className="ml-1 capitalize">{appointment.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {appointment.status === 'scheduled' && (
                          <button
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, 'confirmed')}
                            className="text-blue-600 hover:text-blue-900"
                            title="Confirm appointment"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as completed"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit appointment"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
                </h3>
                <button
                  onClick={() => {
                    setShowAppointmentModal(false);
                    resetAppointmentForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clinic *</label>
                  <select
                    required
                    value={appointmentForm.clinic_id}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, clinic_id: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select clinic</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.clinic_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={appointmentForm.patient_name}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, patient_name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={appointmentForm.patient_email}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, patient_email: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={appointmentForm.patient_phone}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, patient_phone: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={appointmentForm.appointment_date}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointment_date: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time *</label>
                    <select
                      required
                      value={appointmentForm.appointment_time}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointment_time: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select time</option>
                      {APPOINTMENT_TIMES.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Type *</label>
                  <select
                    required
                    value={appointmentForm.service_type}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, service_type: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select service</option>
                    {SERVICE_TYPES.map(service => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-between space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAppointmentModal(false);
                      resetAppointmentForm();
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : editingAppointment ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}