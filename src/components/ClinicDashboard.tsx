import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ClinicDashboardProps {
  clinicCredentials: {
    clinicCode: string;
    token: string;
  };
  onBack: () => void;
}

export function ClinicDashboard({ clinicCredentials, onBack }: ClinicDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'redemptions'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchControl, setSearchControl] = useState('');

  const handleCardLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-82b648e5/cards/clinic-view`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Clinic-Token': clinicCredentials.token
          },
          body: JSON.stringify({
            controlNumber: searchControl
          })
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Card not found');
      }
    } catch (err) {
      console.error('Error looking up card:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-50 px-4 py-2 rounded-lg"
            >
              ← Back
            </button>
            <div>
              <div className="text-2xl text-gray-900 tracking-tight">Clinic Portal</div>
              <div className="text-sm text-gray-500">Welcome, {clinicCredentials.clinicCode}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cards'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Card Management
            </button>
            <button
              onClick={() => setActiveTab('redemptions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'redemptions'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Redemptions
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Active Cards</div>
                <div className="text-3xl text-gray-900 mb-1">0</div>
                <div className="text-sm text-gray-500">Total active patient cards</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Redemptions Today</div>
                <div className="text-3xl text-gray-900 mb-1">0</div>
                <div className="text-sm text-gray-500">Perks redeemed today</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Value</div>
                <div className="text-3xl text-gray-900 mb-1">₱0</div>
                <div className="text-sm text-gray-500">Customer rewards value</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Card Lookup</h3>
              <form onSubmit={handleCardLookup} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter control number (e.g. MO-001)"
                  value={searchControl}
                  onChange={(e) => setSearchControl(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Cards</h3>
              <div className="text-center py-8 text-gray-500">
                No cards found. Use the search above to find patient cards.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'redemptions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Redemptions</h3>
              <div className="text-center py-8 text-gray-500">
                No redemptions found.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}