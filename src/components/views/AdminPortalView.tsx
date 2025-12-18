import { useState } from 'react';
import { Shield, Database, Users, BarChart3, Settings, Plus, TrendingUp, AlertTriangle } from 'lucide-react';

export function AdminPortalView() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'system' | 'users' | 'analytics'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Shield },
    { id: 'system' as const, label: 'System', icon: Database },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  const systemStats = [
    { label: 'Total Cards', value: '12,847', change: '+8%', color: 'bg-blue-500' },
    { label: 'Active Clinics', value: '156', change: '+3%', color: 'bg-green-500' },
    { label: 'System Health', value: '99.9%', change: '0%', color: 'bg-purple-500' },
    { label: 'Revenue (PHP)', value: '₱2.4M', change: '+12%', color: 'bg-yellow-500' },
  ];

  const recentActivities = [
    { action: 'New clinic registered', detail: 'Manila General Hospital', time: '2 hours ago', type: 'success' },
    { action: 'Card batch generated', detail: '500 new MOC cards', time: '4 hours ago', type: 'info' },
    { action: 'System backup completed', detail: 'Database backup successful', time: '6 hours ago', type: 'success' },
    { action: 'Security alert resolved', detail: 'Failed login attempts blocked', time: '1 day ago', type: 'warning' },
  ];

  const systemAlerts = [
    { level: 'warning', message: 'Server load is at 85%', time: '10 minutes ago' },
    { level: 'info', message: 'Scheduled maintenance in 2 days', time: '1 hour ago' },
    { level: 'success', message: 'All systems operating normally', time: '2 hours ago' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="ios-card">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="ios-text-title">Admin Portal</h1>
                <p className="ios-text-body">MOCARDS System Administration</p>
              </div>
            </div>
            <button className="ios-button-primary flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>System Settings</span>
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
                      ? 'bg-red-500 text-white shadow-md'
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
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemStats.map((stat, index) => (
              <div key={index} className="ios-card">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="ios-text-caption">{stat.label}</p>
                      <p className="ios-text-title text-xl font-bold">{stat.value}</p>
                      <p className={`text-sm font-medium ${
                        stat.change.startsWith('+') ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {stat.change} from last month
                      </p>
                    </div>
                    <div className={`w-12 h-12 ${stat.color} rounded-xl opacity-20`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <div className="ios-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="ios-text-subtitle">Recent Activities</h2>
                  <button className="ios-button-secondary text-sm">
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'success' ? 'bg-green-500' :
                        activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="ios-text-caption">{activity.detail}</p>
                        <p className="ios-text-caption text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Alerts */}
            <div className="ios-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="ios-text-subtitle">System Alerts</h2>
                  <button className="ios-button-secondary text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Manage
                  </button>
                </div>

                <div className="space-y-3">
                  {systemAlerts.map((alert, index) => (
                    <div key={index} className={`flex items-start space-x-3 p-3 rounded-xl ${
                      alert.level === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      alert.level === 'success' ? 'bg-green-50 border border-green-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        alert.level === 'warning' ? 'bg-yellow-500' :
                        alert.level === 'success' ? 'bg-green-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="ios-text-caption text-gray-500">{alert.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {selectedTab === 'system' && (
        <div className="ios-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="ios-text-subtitle">System Management</h2>
              <button className="ios-button-primary">
                <Database className="h-4 w-4 mr-2" />
                System Tools
              </button>
            </div>

            <div className="ios-section">
              <div className="text-center py-8">
                <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="ios-text-subtitle mb-2">System Administration</h3>
                <p className="ios-text-body">Manage database, backups, and system configuration.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="ios-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="ios-text-subtitle">User Management</h2>
              <button className="ios-button-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>

            <div className="ios-section">
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="ios-text-subtitle mb-2">User Administration</h3>
                <p className="ios-text-body">Manage clinic staff, administrators, and permissions.</p>
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
              <h2 className="ios-text-subtitle">System Analytics</h2>
              <button className="ios-button-secondary">
                <TrendingUp className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>

            <div className="ios-section">
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="ios-text-subtitle mb-2">Advanced Analytics</h3>
                <p className="ios-text-body">View system performance, usage statistics, and trends.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="ios-card">
        <div className="p-6">
          <h2 className="ios-text-subtitle mb-4">Admin Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="ios-button-secondary p-4 h-auto">
              <Database className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <span className="text-sm">Backup System</span>
            </button>
            <button className="ios-button-secondary p-4 h-auto">
              <Users className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <span className="text-sm">User Audit</span>
            </button>
            <button className="ios-button-secondary p-4 h-auto">
              <Shield className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <span className="text-sm">Security Scan</span>
            </button>
            <button className="ios-button-secondary p-4 h-auto">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <span className="text-sm">Generate Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}