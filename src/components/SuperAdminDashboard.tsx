import { useState } from 'react';
import { ProductionClinicManagement } from './ProductionClinicManagement';
import { AdminCardManagement } from './AdminCardManagement';
import { AdminCardAssignment } from './AdminCardAssignment';
import { AdminAppointmentBooking } from './AdminAppointmentBooking';
import { AnalyticsDashboard } from './AnalyticsDashboard';

interface SuperAdminDashboardProps {
  token: string | null;
  onBack: () => void;
}

export function SuperAdminDashboard({ onBack }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'enhanced' | 'assignment' | 'appointments' | 'clinics' | 'analytics'>('overview');

  // Mock admin user ID - in production, get this from JWT token
  const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f'; // Demo admin ID


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
              onClick={() => setActiveTab('analytics')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Analytics
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

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        )}
      </div>
    </div>
  );
}