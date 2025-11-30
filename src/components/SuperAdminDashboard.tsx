import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SuperAdminDashboardProps {
  token: string | null;
  onBack: () => void;
}

export function SuperAdminDashboard({ token, onBack }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'clinics' | 'analytics'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-82b648e5/admin/create-clinic`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Admin-Token': token || ''
          },
          body: JSON.stringify({})
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create clinic');
      }
    } catch (err) {
      console.error('Error creating clinic:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-50 px-4 py-2 rounded-lg"
            >
              ← Back
            </button>
            <div>
              <div className="text-2xl text-gray-900 tracking-tight">Super Admin</div>
              <div className="text-sm text-gray-500">System Management Portal</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('clinics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'clinics'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Clinics
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Clinics</div>
                <div className="text-3xl text-gray-900 mb-1">0</div>
                <div className="text-sm text-gray-500">Registered clinics</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Cards</div>
                <div className="text-3xl text-gray-900 mb-1">0</div>
                <div className="text-sm text-gray-500">Patient cards issued</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Redemptions</div>
                <div className="text-3xl text-gray-900 mb-1">0</div>
                <div className="text-sm text-gray-500">Total perks redeemed</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">System Value</div>
                <div className="text-3xl text-gray-900 mb-1">₱0</div>
                <div className="text-sm text-gray-500">Total rewards value</div>
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

        {activeTab === 'clinics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Clinic Management</h3>
                <button
                  onClick={handleCreateClinic}
                  disabled={loading}
                  className="bg-gray-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Add Clinic'}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <div className="text-center py-8 text-gray-500">
                No clinics registered yet. Use the "Add Clinic" button to register the first clinic.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Analytics</h3>
              <div className="text-center py-8 text-gray-500">
                Analytics dashboard coming soon. Monitor system usage, popular perks, and clinic performance.
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="text-center py-8 text-gray-500">
                No recent system activity to display.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}