import { useState, useEffect } from 'react';
import { streamlinedOps, CardBatch, Clinic, LocationCode, codeUtils } from '../lib/streamlined-operations';
import {
  Plus,
  Users,
  CreditCard,
  Building2,
  BarChart3,
  Package,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface StreamlinedAdminDashboardProps {
  token: string | null;
  onBack: () => void;
}

export function StreamlinedAdminDashboard({ onBack }: StreamlinedAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'clinics' | 'assign'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for data
  const [stats, setStats] = useState({
    totalClinics: 0,
    totalBatches: 0,
    totalCards: 0,
    unassignedCards: 0,
    assignedCards: 0,
    activatedCards: 0,
  });
  const [batches, setBatches] = useState<CardBatch[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [locationCodes, setLocationCodes] = useState<LocationCode[]>([]);

  // Form states
  const [batchForm, setBatchForm] = useState({
    batch_number: '',
    total_cards: 50,
    location_code: '',
    notes: '',
  });

  const [clinicForm, setClinicForm] = useState({
    clinic_name: '',
    clinic_code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
  });

  const [assignmentForm, setAssignmentForm] = useState({
    clinic_id: '',
    card_count: 10,
  });

  // Load data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboardStats, allBatches, allClinics, allLocationCodes] = await Promise.all([
        streamlinedOps.getDashboardStats(),
        streamlinedOps.getAllBatches(),
        streamlinedOps.getAllClinics(),
        streamlinedOps.getLocationCodes(),
      ]);

      setStats(dashboardStats);
      setBatches(allBatches);
      setClinics(allClinics);
      setLocationCodes(allLocationCodes);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    }
  };

  // Generate new card batch
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create the batch
      const batchNumber = batchForm.batch_number || codeUtils.generateBatchNumber();
      const newBatch = await streamlinedOps.createCardBatch({
        batch_number: batchNumber,
        total_cards: batchForm.total_cards,
        created_by: 'Admin',
        notes: batchForm.notes,
      });

      // Generate cards for the batch
      await streamlinedOps.generateCardsForBatch(
        newBatch.id,
        newBatch.batch_number,
        batchForm.location_code,
        batchForm.total_cards
      );

      setSuccess(`Successfully generated batch ${batchNumber} with ${batchForm.total_cards} cards`);
      setBatchForm({
        batch_number: '',
        total_cards: 50,
        location_code: '',
        notes: '',
      });

      // Reload data
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate batch');
    } finally {
      setLoading(false);
    }
  };

  // Create new clinic
  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await streamlinedOps.createClinic({
        ...clinicForm,
        status: 'active',
        password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // Demo hash for 'clinic123'
      });

      setSuccess(`Successfully created clinic: ${clinicForm.clinic_name}`);
      setClinicForm({
        clinic_name: '',
        clinic_code: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        province: '',
      });

      // Reload data
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to create clinic');
    } finally {
      setLoading(false);
    }
  };

  // Assign cards to clinic
  const handleAssignCards = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const assignedCount = await streamlinedOps.assignCardsToClinic(
        assignmentForm.clinic_id,
        assignmentForm.card_count
      );

      if (assignedCount > 0) {
        setSuccess(`Successfully assigned ${assignedCount} cards to clinic`);
        setAssignmentForm({
          clinic_id: '',
          card_count: 10,
        });

        // Reload data
        await loadDashboardData();
      } else {
        setError('No unassigned cards available');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign cards');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color = 'blue' }: {
    icon: any;
    label: string;
    value: number;
    color?: string;
  }) => (
    <div className={`bg-white rounded-lg p-6 border-l-4 border-${color}-500 shadow-sm`}>
      <div className="flex items-center">
        <Icon className={`h-8 w-8 text-${color}-600`} />
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="text-sm text-gray-500">
              Streamlined MOCARDS System
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'generate', label: 'Generate Cards', icon: Plus },
              { key: 'clinics', label: 'Manage Clinics', icon: Building2 },
              { key: 'assign', label: 'Assign Cards', icon: CreditCard },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard icon={Building2} label="Total Clinics" value={stats.totalClinics} color="green" />
              <StatCard icon={Package} label="Card Batches" value={stats.totalBatches} color="blue" />
              <StatCard icon={CreditCard} label="Total Cards" value={stats.totalCards} color="purple" />
              <StatCard icon={Users} label="Unassigned" value={stats.unassignedCards} color="yellow" />
              <StatCard icon={CheckCircle} label="Assigned" value={stats.assignedCards} color="orange" />
              <StatCard icon={CreditCard} label="Activated" value={stats.activatedCards} color="green" />
            </div>

            {/* Recent Batches */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Card Batches</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cards</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {batches.slice(0, 5).map((batch) => (
                      <tr key={batch.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{batch.batch_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.total_cards}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.cards_assigned}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            batch.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Generate Cards Tab */}
        {activeTab === 'generate' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Generate New Card Batch</h3>
              <form onSubmit={handleGenerateBatch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number (optional)</label>
                  <input
                    type="text"
                    value={batchForm.batch_number}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, batch_number: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty for auto-generation"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Number of Cards *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="1000"
                      value={batchForm.total_cards}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, total_cards: parseInt(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location Code *</label>
                    <select
                      required
                      value={batchForm.location_code}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, location_code: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Location</option>
                      {locationCodes.map((loc) => (
                        <option key={loc.id} value={loc.code}>{loc.code} - {loc.location_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={batchForm.notes}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional notes about this batch"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Card Batch'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Clinics Tab */}
        {activeTab === 'clinics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Clinic Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Add New Clinic</h3>
              <form onSubmit={handleCreateClinic} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Clinic Name *</label>
                    <input
                      type="text"
                      required
                      value={clinicForm.clinic_name}
                      onChange={(e) => setClinicForm(prev => ({ ...prev, clinic_name: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Clinic Code *</label>
                    <input
                      type="text"
                      required
                      value={clinicForm.clinic_code}
                      onChange={(e) => setClinicForm(prev => ({ ...prev, clinic_code: e.target.value.toUpperCase() }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                    <input
                      type="text"
                      value={clinicForm.contact_person}
                      onChange={(e) => setClinicForm(prev => ({ ...prev, contact_person: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={clinicForm.email}
                      onChange={(e) => setClinicForm(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={clinicForm.address}
                    onChange={(e) => setClinicForm(prev => ({ ...prev, address: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={clinicForm.city}
                      onChange={(e) => setClinicForm(prev => ({ ...prev, city: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Province</label>
                    <input
                      type="text"
                      value={clinicForm.province}
                      onChange={(e) => setClinicForm(prev => ({ ...prev, province: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Clinic'}
                </button>
              </form>
            </div>

            {/* Clinics List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Clinics ({clinics.length})</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {clinics.map((clinic) => (
                  <div key={clinic.id} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{clinic.clinic_name}</h4>
                        <p className="text-sm text-gray-500">Code: {clinic.clinic_code}</p>
                        {clinic.contact_person && (
                          <p className="text-sm text-gray-500">Contact: {clinic.contact_person}</p>
                        )}
                        {clinic.city && clinic.province && (
                          <p className="text-sm text-gray-500">{clinic.city}, {clinic.province}</p>
                        )}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        clinic.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {clinic.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assign Cards Tab */}
        {activeTab === 'assign' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Assign Cards to Clinic</h3>
              <form onSubmit={handleAssignCards} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Clinic *</label>
                  <select
                    required
                    value={assignmentForm.clinic_id}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, clinic_id: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a clinic</option>
                    {clinics.filter(c => c.status === 'active').map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.clinic_name} ({clinic.clinic_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Cards *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={stats.unassignedCards}
                    value={assignmentForm.card_count}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, card_count: parseInt(e.target.value) }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Available unassigned cards: {stats.unassignedCards}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || stats.unassignedCards === 0}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign Cards'}
                </button>
              </form>

              {stats.unassignedCards === 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                  <AlertCircle className="h-5 w-5 inline mr-2" />
                  No unassigned cards available. Generate a new batch first.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}