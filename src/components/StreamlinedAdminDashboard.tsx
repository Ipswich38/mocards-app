import { useState, useEffect } from 'react';
import { streamlinedOps, CardBatch, Clinic, LocationCode, codeUtils } from '../lib/streamlined-operations';
import { AdminSettings } from './AdminSettings';
import { AdminPerkManagement } from './AdminPerkManagement';
import {
  Plus,
  Users,
  CreditCard,
  Building2,
  BarChart3,
  Package,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  MapPin,
  Menu,
  X,
  Settings,
  Eye,
  Calendar,
  Gift,
  LogOut
} from 'lucide-react';

interface StreamlinedAdminDashboardProps {
  token: string | null;
  onBack: () => void;
}

export function StreamlinedAdminDashboard({ token, onBack }: StreamlinedAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'clinics' | 'locations' | 'settings' | 'cards' | 'appointments' | 'perks'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddClinicModal, setShowAddClinicModal] = useState(false);
  const [pendingBatch, setPendingBatch] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    total_cards: 500,
    location_code: '',
    notes: '',
    assignment_option: 'later', // 'later', 'existing', 'new'
    selected_clinic_id: '',
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


  const [locationForm, setLocationForm] = useState({
    code: '',
    location_name: '',
    description: '',
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
      // Check assignment option
      if (batchForm.assignment_option === 'existing' && !batchForm.selected_clinic_id) {
        setError('Please select a clinic for assignment');
        setLoading(false);
        return;
      }

      if (batchForm.assignment_option === 'new') {
        // Show add clinic modal and pause generation
        const generatedBatchNumber = batchForm.batch_number || await codeUtils.generateBatchNumber();
        setPendingBatch({
          batch_number: generatedBatchNumber,
          total_cards: batchForm.total_cards,
          location_code: batchForm.location_code,
          notes: batchForm.notes,
        });
        setShowAddClinicModal(true);
        setLoading(false);
        return;
      }

      // Create the batch
      const batchNumber = batchForm.batch_number || await codeUtils.generateBatchNumber();
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

      let successMessage = `Successfully generated batch ${batchNumber} with ${batchForm.total_cards} cards`;

      // Handle immediate assignment if selected
      if (batchForm.assignment_option === 'existing' && batchForm.selected_clinic_id) {
        const assignedCount = await streamlinedOps.assignCardsToClinic(
          batchForm.selected_clinic_id,
          batchForm.total_cards
        );
        const selectedClinic = clinics.find(c => c.id === batchForm.selected_clinic_id);
        successMessage += ` and assigned all ${assignedCount} cards to ${selectedClinic?.clinic_name}`;
      }

      setSuccess(successMessage);
      setBatchForm({
        batch_number: '',
        total_cards: 500,
        location_code: '',
        notes: '',
        assignment_option: 'later',
        selected_clinic_id: '',
      });

      // Reload data
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate batch');
    } finally {
      setLoading(false);
    }
  };

  // Create new clinic from modal and continue with batch generation
  const handleCreateClinicFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const newClinic = await streamlinedOps.createClinic({
        ...clinicForm,
        status: 'active',
        password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // Demo hash for 'clinic123'
      });

      // Close modal and continue with pending batch generation
      setShowAddClinicModal(false);

      if (pendingBatch) {
        // Create the batch
        const newBatch = await streamlinedOps.createCardBatch({
          batch_number: pendingBatch.batch_number,
          total_cards: pendingBatch.total_cards,
          created_by: 'Admin',
          notes: pendingBatch.notes,
        });

        // Generate cards for the batch
        await streamlinedOps.generateCardsForBatch(
          newBatch.id,
          newBatch.batch_number,
          pendingBatch.location_code,
          pendingBatch.total_cards
        );

        // Assign cards to the new clinic
        const assignedCount = await streamlinedOps.assignCardsToClinic(
          newClinic.id,
          pendingBatch.total_cards
        );

        setSuccess(`Successfully created clinic "${newClinic.clinic_name}", generated batch ${pendingBatch.batch_number} with ${pendingBatch.total_cards} cards, and assigned all ${assignedCount} cards to the new clinic`);

        setPendingBatch(null);
        setBatchForm({
          batch_number: '',
          total_cards: 500,
          location_code: '',
          notes: '',
          assignment_option: 'later',
          selected_clinic_id: '',
        });
      }

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
      setError(err.message || 'Failed to create clinic and generate cards');
    } finally {
      setLoading(false);
    }
  };

  // Create new clinic (regular function for clinics tab)
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

  // Bulk import Philippine locations
  const handleBulkImportPhilippineLocations = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const philippineLocations = [
        // LUZON
        { code: '006', location_name: 'Quezon City', description: 'National Capital Region' },
        { code: '007', location_name: 'Caloocan', description: 'National Capital Region' },
        { code: '008', location_name: 'Las Piñas', description: 'National Capital Region' },
        { code: '009', location_name: 'Makati', description: 'National Capital Region' },
        { code: '010', location_name: 'Pasig', description: 'National Capital Region' },
        { code: '011', location_name: 'Laoag', description: 'Ilocos Norte' },
        { code: '012', location_name: 'Vigan', description: 'Ilocos Sur' },
        { code: '013', location_name: 'Dagupan', description: 'Pangasinan' },
        { code: '014', location_name: 'San Fernando', description: 'La Union' },
        { code: '015', location_name: 'Angeles', description: 'Pampanga' },
        { code: '016', location_name: 'Olongapo', description: 'Zambales' },
        { code: '017', location_name: 'Batangas City', description: 'Batangas' },
        { code: '018', location_name: 'Lipa', description: 'Batangas' },
        { code: '019', location_name: 'Puerto Princesa', description: 'Palawan' },
        { code: '020', location_name: 'Lucena', description: 'Quezon' },

        // VISAYAS
        { code: '021', location_name: 'Cebu City', description: 'Central Visayas' },
        { code: '022', location_name: 'Mandaue', description: 'Central Visayas' },
        { code: '023', location_name: 'Lapu-Lapu', description: 'Central Visayas' },
        { code: '024', location_name: 'Dumaguete', description: 'Negros Oriental' },
        { code: '025', location_name: 'Bacolod', description: 'Negros Occidental' },
        { code: '026', location_name: 'Roxas', description: 'Capiz' },
        { code: '027', location_name: 'Kalibo', description: 'Aklan' },
        { code: '028', location_name: 'Tacloban', description: 'Eastern Visayas' },
        { code: '029', location_name: 'Ormoc', description: 'Eastern Visayas' },

        // MINDANAO
        { code: '030', location_name: 'Davao City', description: 'Davao Region' },
        { code: '031', location_name: 'General Santos', description: 'South Cotabato' },
        { code: '032', location_name: 'Cagayan de Oro', description: 'Misamis Oriental' },
        { code: '033', location_name: 'Iligan', description: 'Lanao del Norte' },
        { code: '034', location_name: 'Butuan', description: 'Agusan del Norte' },
        { code: '035', location_name: 'Surigao', description: 'Surigao del Norte' },
        { code: '036', location_name: 'Zamboanga City', description: 'Zamboanga del Sur' },
        { code: '037', location_name: 'Pagadian', description: 'Zamboanga del Sur' },
        { code: '038', location_name: 'Dipolog', description: 'Zamboanga del Norte' },
        { code: '039', location_name: 'Cotabato City', description: 'Maguindanao' },
        { code: '040', location_name: 'Kidapawan', description: 'North Cotabato' },
      ];

      let importedCount = 0;
      let skippedCount = 0;

      for (const location of philippineLocations) {
        try {
          await streamlinedOps.createLocationCode({
            ...location,
            is_active: true,
          });
          importedCount++;
        } catch (err: any) {
          if (err.message.includes('already exists')) {
            skippedCount++;
          } else {
            console.warn(`Failed to import ${location.location_name}:`, err);
          }
        }
      }

      setSuccess(`Successfully imported ${importedCount} Philippine locations. ${skippedCount} locations were skipped (already exist).`);

      // Reload data to update the list
      await loadDashboardData();
    } catch (err: any) {
      setError(`Bulk import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Create new location code
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await streamlinedOps.createLocationCode({
        code: locationForm.code.toUpperCase(),
        location_name: locationForm.location_name,
        description: locationForm.description,
        is_active: true,
      });

      setSuccess(`Successfully created location code: ${locationForm.code.toUpperCase()} - ${locationForm.location_name}`);
      setLocationForm({
        code: '',
        location_name: '',
        description: '',
      });

      // Reload data to update dropdown
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to create location code');
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

  // Logout handler
  const handleLogout = () => {
    // Clear any stored session data
    localStorage.removeItem('admin-session');
    sessionStorage.removeItem('admin-token');
    // Navigate back to login
    onBack();
  };

  const navigationItems = [
    { key: 'overview', label: 'Overview', icon: BarChart3, description: 'Dashboard statistics' },
    { key: 'generate', label: 'Generate Cards', icon: Plus, description: 'Create card batches' },
    { key: 'clinics', label: 'Manage Clinics', icon: Building2, description: 'Clinic management' },
    { key: 'locations', label: 'Manage Locations', icon: MapPin, description: 'Location codes' },
    { key: 'cards', label: 'Card Management', icon: Eye, description: 'View and manage cards' },
    { key: 'appointments', label: 'Appointments', icon: Calendar, description: 'Appointment calendar' },
    { key: 'perks', label: 'Perk Management', icon: Gift, description: 'Manage perks & templates' },
    { key: 'settings', label: 'System Settings', icon: Settings, description: 'Configuration & customization' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">MOCARDS</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1">
          {navigationItems.map(({ key, label, icon: Icon, description }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                activeTab === key
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={sidebarCollapsed ? label : ''}
            >
              <Icon className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-gray-500">{description}</div>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Logout & Back Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center p-3 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
            {!sidebarCollapsed && (
              <div className="text-sm font-medium">Logout</div>
            )}
          </button>

          <button
            onClick={onBack}
            className={`w-full flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title={sidebarCollapsed ? 'Back to Main' : ''}
          >
            <ArrowLeft className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
            {!sidebarCollapsed && (
              <div className="text-sm font-medium">Back to Main</div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {navigationItems.find(item => item.key === activeTab)?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {navigationItems.find(item => item.key === activeTab)?.description || 'Streamlined MOCARDS System'}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-PH', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content Container with proper scrolling */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
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
                      max="10000"
                      value={batchForm.total_cards}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, total_cards: parseInt(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Default: 500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Default is 500 cards per batch</p>
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

                {/* Assignment Options */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Card Assignment Options</label>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        id="assign_later"
                        name="assignment_option"
                        type="radio"
                        value="later"
                        checked={batchForm.assignment_option === 'later'}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, assignment_option: e.target.value as any }))}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label htmlFor="assign_later" className="ml-3 block text-sm text-gray-900">
                        <span className="font-medium">Assign Later</span>
                        <span className="block text-gray-500">Generate cards and assign to clinics later</span>
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="assign_existing"
                        name="assignment_option"
                        type="radio"
                        value="existing"
                        checked={batchForm.assignment_option === 'existing'}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, assignment_option: e.target.value as any }))}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label htmlFor="assign_existing" className="ml-3 block text-sm text-gray-900">
                        <span className="font-medium">Assign to Existing Clinic</span>
                        <span className="block text-gray-500">Choose from current clinic list</span>
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="assign_new"
                        name="assignment_option"
                        type="radio"
                        value="new"
                        checked={batchForm.assignment_option === 'new'}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, assignment_option: e.target.value as any }))}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label htmlFor="assign_new" className="ml-3 block text-sm text-gray-900">
                        <span className="font-medium">Create New Clinic & Assign</span>
                        <span className="block text-gray-500">Add a new clinic and assign cards immediately</span>
                      </label>
                    </div>
                  </div>

                  {/* Clinic Selection for Existing Option */}
                  {batchForm.assignment_option === 'existing' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Select Clinic *</label>
                      <select
                        required
                        value={batchForm.selected_clinic_id}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, selected_clinic_id: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Choose a clinic</option>
                        {clinics.filter(c => c.status === 'active').map((clinic) => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.clinic_name} ({clinic.clinic_code})
                          </option>
                        ))}
                      </select>
                      {clinics.filter(c => c.status === 'active').length === 0 && (
                        <p className="mt-1 text-sm text-red-600">No active clinics found. Please create a clinic first.</p>
                      )}
                    </div>
                  )}
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


        {/* Manage Locations Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            {/* Bulk Import Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">🇵🇭 Philippine Locations</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Import 35+ major cities from Luzon, Visayas, and Mindanao
                  </p>
                </div>
                <button
                  onClick={handleBulkImportPhilippineLocations}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import Philippine Locations'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create Location Form */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Add Custom Location Code</h3>
              <form onSubmit={handleCreateLocation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={locationForm.code}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 006"
                  />
                  <p className="mt-1 text-xs text-gray-500">3-digit code for passcode generation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={locationForm.location_name}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, location_name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Bacolod"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={locationForm.description}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Western Visayas"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Location Code'}
                </button>
              </form>
            </div>

            {/* Locations List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Location Codes ({locationCodes.length})</h3>
                <p className="text-sm text-gray-600 mt-1">Used for passcode generation during card creation</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {locationCodes.map((location) => (
                  <div key={location.id} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {location.code}
                          </span>
                          <h4 className="text-sm font-medium text-gray-900 ml-3">{location.location_name}</h4>
                        </div>
                        {location.description && (
                          <p className="text-sm text-gray-500 mt-1">{location.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Generates passcodes: {location.code}-XXXX
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        location.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
                {locationCodes.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No location codes found. Add your first location code above.</p>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Card Management Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Card Management</h3>
                <p className="text-sm text-gray-600 mt-1">View, edit, and manage individual cards across all batches and clinics</p>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Card management interface will be implemented here</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Features: Search cards, update status, reassign cards, view card history
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Appointment Calendar</h3>
                <p className="text-sm text-gray-600 mt-1">Manage clinic appointments and scheduling</p>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Appointment calendar interface will be restored here</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Features: View appointments, schedule new appointments, manage clinic calendars
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Perk Management Tab */}
        {activeTab === 'perks' && (
          <AdminPerkManagement adminUserId="admin" />
        )}

        {/* System Settings Tab */}
        {activeTab === 'settings' && (
          <AdminSettings token={token} />
        )}
          </div>
        </div>
      </div>

      {/* Add Clinic Modal */}
      {showAddClinicModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Clinic</h3>
                <button
                  onClick={() => {
                    setShowAddClinicModal(false);
                    setPendingBatch(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleCreateClinicFromModal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clinic Name *</label>
                  <input
                    type="text"
                    required
                    value={clinicForm.clinic_name}
                    onChange={(e) => setClinicForm(prev => ({ ...prev, clinic_name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter clinic name"
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
                    placeholder="Enter unique clinic code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    value={clinicForm.contact_person}
                    onChange={(e) => setClinicForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={clinicForm.email}
                    onChange={(e) => setClinicForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="clinic@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={clinicForm.city}
                    onChange={(e) => setClinicForm(prev => ({ ...prev, city: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City name"
                  />
                </div>

                <div className="flex justify-between space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddClinicModal(false);
                      setPendingBatch(null);
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create & Assign'}
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