import { useState } from 'react';
import { ProductionClinicManagement } from './ProductionClinicManagement';
import { AdminCardManagement } from './AdminCardManagement';
import { AdminCardAssignment } from './AdminCardAssignment';
import { AdminAppointmentBooking } from './AdminAppointmentBooking';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { AdminSystemReset } from './AdminSystemReset';
import { AdminProfileManagement } from './AdminProfileManagement';
import { AdminPerkManagement } from './AdminPerkManagement';
import { AdminCardCodeManagement } from './AdminCardCodeManagement';
import { useAutoLogout } from '../hooks/useAutoLogout';

interface SuperAdminDashboardProps {
  token: string | null;
  onBack: () => void;
}

export function SuperAdminDashboard({ onBack }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'enhanced' | 'assignment' | 'appointments' | 'clinics' | 'perks' | 'codes' | 'analytics' | 'reset' | 'profile'>('overview');
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // Mock admin user ID - in production, get this from JWT token
  const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f'; // Demo admin ID

  const handleLogout = () => {
    // Clear any stored admin session data
    localStorage.removeItem('admin-session');
    sessionStorage.removeItem('admin-token');

    // Navigate back to login
    onBack();
  };

  const handleWarning = () => {
    setShowLogoutWarning(true);
  };

  const extendSession = () => {
    setShowLogoutWarning(false);
    // resetTimer is called automatically by user activity
  };

  // Auto-logout after 30 minutes of inactivity
  useAutoLogout({
    onLogout: handleLogout,
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes before timeout
    onWarning: handleWarning
  });


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Notice */}
      <div className="bg-gray-50 border-b border-gray-200 py-2 sm:py-3 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs sm:text-sm text-gray-700 text-center">
            🔧 <strong>Admin Dashboard:</strong> Manage responsibly
            <span className="hidden sm:inline"> your MOCARDS platform</span>.
            <span className="block sm:inline sm:ml-2 text-gray-600 text-xs mt-1 sm:mt-0">
              <span className="hidden sm:inline">For legitimate dental loyalty programs • </span>Review Legal Disclaimer
            </span>
          </p>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200 py-4 sm:py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-0">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={onBack}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg"
              >
                ← Back
              </button>
              <div className="hidden sm:block">
                <div className="text-xl sm:text-2xl text-gray-900 tracking-tight">Super Admin</div>
                <div className="text-sm text-gray-500">System Management Portal</div>
              </div>
              <div className="sm:hidden">
                <div className="text-lg text-gray-900 tracking-tight">Admin</div>
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

          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('enhanced')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'enhanced'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">MOCARDS</span> Generator
            </button>
            <button
              onClick={() => setActiveTab('assignment')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'assignment'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">Card</span> Assignment
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab('clinics')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'clinics'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Clinics
            </button>
            <button
              onClick={() => setActiveTab('perks')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'perks'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">Perk</span> Management
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'codes'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">Card</span> Codes
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('reset')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'reset'
                  ? 'bg-red-600 text-white'
                  : 'text-red-600 hover:bg-red-50 border border-red-200'
              }`}
            >
              <span className="hidden sm:inline">System</span> Reset
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">Admin</span> Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Clinics</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">0</div>
                <div className="text-xs sm:text-sm text-gray-500">Registered</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Cards</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">0</div>
                <div className="text-xs sm:text-sm text-gray-500">Issued</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Redemptions</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">0</div>
                <div className="text-xs sm:text-sm text-gray-500">Total perks</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Value</div>
                <div className="text-2xl sm:text-3xl text-gray-900 mb-1">₱0</div>
                <div className="text-xs sm:text-sm text-gray-500">Rewards</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-700">Database Status</span>
                  <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider bg-green-500/20 text-green-700 border border-green-500/30">
                    ● Online
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-700">API Status</span>
                  <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider bg-green-500/20 text-green-700 border border-green-500/30">
                    ● Online
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-700">Authentication Service</span>
                  <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider bg-green-500/20 text-green-700 border border-green-500/30">
                    ● Online
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'enhanced' && (
          <div className="space-y-6">
            <AdminCardManagement adminUserId={adminUserId} />
          </div>
        )}

        {activeTab === 'assignment' && (
          <div className="space-y-6">
            <AdminCardAssignment />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <AdminAppointmentBooking adminUserId={adminUserId} />
          </div>
        )}

        {activeTab === 'clinics' && (
          <div className="space-y-6">
            <ProductionClinicManagement />
          </div>
        )}

        {activeTab === 'perks' && (
          <div className="space-y-6">
            <AdminPerkManagement adminUserId={adminUserId} />
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="space-y-6">
            <AdminCardCodeManagement adminId={adminUserId} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        )}

        {activeTab === 'reset' && (
          <div className="space-y-6">
            <AdminSystemReset />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <AdminProfileManagement />
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
                Your admin session will expire in 5 minutes due to inactivity. Would you like to extend your session?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={extendSession}
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
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