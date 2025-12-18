import { useState } from 'react';
import { Stethoscope, Users, Calendar, BarChart3, Settings, Plus, Eye } from 'lucide-react';

export function ClinicPortalView() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'patients' | 'appointments' | 'analytics'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Stethoscope },
    { id: 'patients' as const, label: 'Patients', icon: Users },
    { id: 'appointments' as const, label: 'Appointments', icon: Calendar },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  const stats = [
    { label: 'Active Patients', value: '2,847', change: '+12%', color: 'bg-blue-500' },
    { label: 'Today\'s Appointments', value: '42', change: '+5%', color: 'bg-green-500' },
    { label: 'Card Verifications', value: '186', change: '+8%', color: 'bg-purple-500' },
    { label: 'Revenue (PHP)', value: '₱45,600', change: '+15%', color: 'bg-yellow-500' },
  ];

  const recentPatients = [
    { id: 'MOC-000124', name: 'Maria Santos', status: 'Active', lastVisit: '2 hours ago' },
    { id: 'MOC-000135', name: 'Juan Dela Cruz', status: 'Active', lastVisit: '1 day ago' },
    { id: 'MOC-000142', name: 'Ana Garcia', status: 'Pending', lastVisit: '3 days ago' },
    { id: 'MOC-000158', name: 'Carlos Rodriguez', status: 'Active', lastVisit: '1 week ago' },
  ];

  const upcomingAppointments = [
    { time: '9:00 AM', patient: 'Maria Santos', type: 'Consultation', id: 'MOC-000124' },
    { time: '10:30 AM', patient: 'Juan Dela Cruz', type: 'Follow-up', id: 'MOC-000135' },
    { time: '2:00 PM', patient: 'Ana Garcia', type: 'Check-up', id: 'MOC-000142' },
    { time: '4:15 PM', patient: 'Carlos Rodriguez', type: 'Consultation', id: 'MOC-000158' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="ios-card">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="ios-text-title">Clinic Portal</h1>
                <p className="ios-text-body">Central Valley Clinic - CVT001</p>
              </div>
            </div>
            <button className="ios-button-primary flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ios-card">
        <div className="p-2">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="ios-card">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="ios-text-caption">{stat.label}</p>
                      <p className="ios-text-title text-xl font-bold">{stat.value}</p>
                      <p className="text-green-600 text-sm font-medium">{stat.change} from last month</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.color} rounded-xl opacity-20`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Patients */}
            <div className="ios-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="ios-text-subtitle">Recent Patients</h2>
                  <button className="ios-button-secondary text-sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {recentPatients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="ios-text-caption">{patient.id}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          patient.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {patient.status}
                        </span>
                        <p className="ios-text-caption mt-1">{patient.lastVisit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="ios-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="ios-text-subtitle">Today's Schedule</h2>
                  <button className="ios-button-secondary text-sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </button>
                </div>

                <div className="space-y-3">
                  {upcomingAppointments.map((appointment, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-blue-50 rounded-xl">
                      <div className="w-16 text-center">
                        <p className="font-bold text-blue-600">{appointment.time}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{appointment.patient}</p>
                        <p className="ios-text-caption">{appointment.type} • {appointment.id}</p>
                      </div>
                      <button className="ios-button-secondary text-xs px-3 py-1">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {selectedTab === 'patients' && (
        <div className="ios-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="ios-text-subtitle">Patient Management</h2>
              <button className="ios-button-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search patients by name or MOC number..."
                  className="ios-input flex-1"
                />
                <button className="ios-button-secondary px-6">
                  Search
                </button>
              </div>

              <div className="ios-section">
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="ios-text-subtitle mb-2">Patient Management System</h3>
                  <p className="ios-text-body">Search for patients or add new ones to get started.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {selectedTab === 'appointments' && (
        <div className="ios-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="ios-text-subtitle">Appointment Schedule</h2>
              <button className="ios-button-primary">
                <Calendar className="h-4 w-4 mr-2" />
                New Appointment
              </button>
            </div>

            <div className="ios-section">
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="ios-text-subtitle mb-2">Appointment Calendar</h3>
                <p className="ios-text-body">Manage your clinic's appointment schedule here.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="ios-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="ios-text-subtitle">Clinic Analytics</h2>
              <button className="ios-button-secondary">
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>

            <div className="ios-section">
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="ios-text-subtitle mb-2">Analytics Dashboard</h3>
                <p className="ios-text-body">View comprehensive analytics and reports for your clinic.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="ios-card">
        <div className="p-6">
          <h2 className="ios-text-subtitle mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="ios-button-secondary p-4 h-auto">
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <span className="text-sm">Register Patient</span>
            </button>
            <button className="ios-button-secondary p-4 h-auto">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <span className="text-sm">Schedule Visit</span>
            </button>
            <button className="ios-button-secondary p-4 h-auto">
              <Stethoscope className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <span className="text-sm">Verify Card</span>
            </button>
            <button className="ios-button-secondary p-4 h-auto">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <span className="text-sm">View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}