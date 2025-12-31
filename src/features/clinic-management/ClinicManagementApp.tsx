import { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

// Interface matching existing schema
interface Clinic {
  id: string;
  name: string;
  username: string;
  region: string;
  plan: 'starter' | 'growth' | 'pro';
  code: string;
  address?: string;
  adminClinic?: string;
  email?: string;
  contactNumber?: string;
  password: string;
  subscriptionPrice: number;
  subscriptionStatus: 'active' | 'suspended' | 'cancelled';
  maxCards: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClinicForm {
  name: string;
  username: string;
  region: string;
  plan: 'starter' | 'growth' | 'pro';
  areaCode: string;
  customAreaCode: string;
  password: string;
  address: string;
  adminClinic: string;
  email: string;
  contactNumber: string;
}

interface ClinicManagementAppProps {
  onSuccess?: () => Promise<void>;
}

const PHILIPPINES_REGIONS = [
  { code: '01', name: 'Ilocos Region (Region 1)' },
  { code: '02', name: 'Cagayan Valley (Region 2)' },
  { code: '03', name: 'Central Luzon (Region 3)' },
  { code: '4A', name: 'Calabarzon (Region 4A)' },
  { code: '4B', name: 'Mimaropa (Region 4B)' },
  { code: '05', name: 'Bicol Region (Region 5)' },
  { code: '06', name: 'Western Visayas (Region 6)' },
  { code: '07', name: 'Central Visayas (Region 7)' },
  { code: '08', name: 'Eastern Visayas (Region 8)' },
  { code: '09', name: 'Zamboanga Peninsula (Region 9)' },
  { code: '10', name: 'Northern Mindanao (Region 10)' },
  { code: '11', name: 'Davao Region (Region 11)' },
  { code: '12', name: 'SOCCSKSARGEN (Region 12)' },
  { code: '13', name: 'Caraga (Region 13)' },
  { code: 'NCR', name: 'National Capital Region (NCR)' },
  { code: 'CAR', name: 'Cordillera Administrative Region (CAR)' },
  { code: 'BARMM', name: 'Bangsamoro Autonomous Region in Muslim Mindanao' }
];

const AREA_CODES = [
  'CVT001', 'CVT002', 'CVT003', 'CVT004', 'CVT005',
  'BTG001', 'BTG002', 'BTG003', 'BTG004', 'BTG005',
  'LAG001', 'LAG002', 'LAG003', 'LAG004', 'LAG005',
  'NCR001', 'NCR002', 'NCR003', 'NCR004', 'NCR005',
  'Custom'
];

const PLAN_PRICING = { starter: 499, growth: 999, pro: 1999 };
const PLAN_LIMITS = { starter: 100, growth: 500, pro: 2000 };

export function ClinicManagementApp({ onSuccess }: ClinicManagementAppProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<ClinicForm>({
    name: '',
    username: '',
    region: '',
    plan: 'starter',
    areaCode: '',
    customAreaCode: '',
    password: '',
    address: '',
    adminClinic: '',
    email: '',
    contactNumber: ''
  });

  // Test database connection and load clinics
  const testConnectionAndLoadData = async () => {
    try {
      setConnectionStatus('checking');
      const { supabase } = await import('../../lib/supabase');

      // Test connection
      const { error: testError } = await supabase
        .from('clinics')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('❌ Clinic database connection failed:', testError);
        setConnectionStatus('error');
        return;
      }

      console.log('✅ Clinic database connection successful');
      setConnectionStatus('connected');

      // Load clinics
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (clinicsError) {
        console.error('❌ Failed to load clinics:', clinicsError);
        throw new Error(clinicsError.message);
      }

      setClinics(clinicsData || []);
      console.log('✅ Loaded', (clinicsData || []).length, 'clinics');

    } catch (error) {
      console.error('💥 Clinic management connection failed:', error);
      setConnectionStatus('error');
    }
  };

  // Load data on mount
  useEffect(() => {
    testConnectionAndLoadData();
  }, []);

  // Generate clinic code
  const generateClinicCode = (region: string, areaCode: string): string => {
    const finalAreaCode = areaCode === 'Custom' ? form.customAreaCode : areaCode;
    const timestamp = Date.now().toString().slice(-4);
    return `${region}-${finalAreaCode}-${timestamp}`;
  };

  // Create clinic
  const handleCreateClinic = async () => {
    // Validation
    if (!form.name || !form.username || !form.region || !form.areaCode || !form.password) {
      alert('❌ Please fill all required fields');
      return;
    }

    if (form.areaCode === 'Custom' && !form.customAreaCode) {
      alert('❌ Please enter custom area code');
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import('../../lib/supabase');

      // Generate unique clinic code
      const clinicCode = generateClinicCode(form.region, form.areaCode);

      const newClinic = {
        name: form.name,
        username: form.username,
        region: form.region,
        plan: form.plan,
        code: clinicCode,
        area_code: form.areaCode === 'Custom' ? form.customAreaCode : form.areaCode,
        custom_area_code: form.areaCode === 'Custom' ? form.customAreaCode : null,
        address: form.address || null,
        admin_clinic: form.adminClinic || null,
        email: form.email || null,
        contact_number: form.contactNumber || null,
        password_hash: form.password, // In production, hash this
        subscription_status: 'active',
        max_cards_allowed: PLAN_LIMITS[form.plan],
        is_active: true
      };

      const { data, error } = await supabase
        .from('clinics')
        .insert(newClinic)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Clinic created successfully:', data);

      // Reset form and close
      resetForm();
      setShowForm(false);

      // Reload data and refresh parent
      await testConnectionAndLoadData();
      if (onSuccess) {
        await onSuccess();
      }

      alert(`🎉 Clinic "${form.name}" created successfully with code ${clinicCode}!`);

    } catch (error: any) {
      console.error('💥 Clinic creation failed:', error);
      alert(`❌ Failed to create clinic: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update clinic
  const handleUpdateClinic = async () => {
    if (!editingClinic || !form.name || !form.region) {
      alert('❌ Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import('../../lib/supabase');

      const updates: any = {
        name: form.name,
        username: form.username,
        region: form.region,
        plan: form.plan,
        area_code: form.areaCode === 'Custom' ? form.customAreaCode : form.areaCode,
        custom_area_code: form.areaCode === 'Custom' ? form.customAreaCode : null,
        address: form.address || null,
        admin_clinic: form.adminClinic || null,
        email: form.email || null,
        contact_number: form.contactNumber || null,
        max_cards_allowed: PLAN_LIMITS[form.plan],
        updated_at: new Date().toISOString()
      };

      // Only update password if provided
      if (form.password.trim()) {
        updates.password_hash = form.password;
      }

      const { error } = await supabase
        .from('clinics')
        .update(updates)
        .eq('id', editingClinic.id);

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Clinic updated successfully');

      // Reset form and close
      resetForm();
      setShowForm(false);
      setEditingClinic(null);

      // Reload data and refresh parent
      await testConnectionAndLoadData();
      if (onSuccess) {
        await onSuccess();
      }

      alert(`🎉 Clinic "${form.name}" updated successfully!`);

    } catch (error: any) {
      console.error('💥 Clinic update failed:', error);
      alert(`❌ Failed to update clinic: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete clinic
  const handleDeleteClinic = async (clinic: Clinic) => {
    if (!confirm(`⚠️ Are you sure you want to delete "${clinic.name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import('../../lib/supabase');

      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', clinic.id);

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Clinic deleted successfully');

      // Reload data and refresh parent
      await testConnectionAndLoadData();
      if (onSuccess) {
        await onSuccess();
      }

      alert(`🗑️ Clinic "${clinic.name}" deleted successfully!`);

    } catch (error: any) {
      console.error('💥 Clinic deletion failed:', error);
      alert(`❌ Failed to delete clinic: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Edit clinic
  const handleEditClinic = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setForm({
      name: clinic.name,
      username: clinic.username,
      region: clinic.region,
      plan: clinic.plan,
      areaCode: 'CVT001', // Default, since we can't reverse-engineer from code
      customAreaCode: '',
      password: '', // Don't populate for security
      address: clinic.address || '',
      adminClinic: clinic.adminClinic || '',
      email: clinic.email || '',
      contactNumber: clinic.contactNumber || ''
    });
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setForm({
      name: '',
      username: '',
      region: '',
      plan: 'starter',
      areaCode: '',
      customAreaCode: '',
      password: '',
      address: '',
      adminClinic: '',
      email: '',
      contactNumber: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manage Clinics</h2>
          <p className="text-gray-600">Enterprise clinic management with real-time sync</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {connectionStatus === 'checking' && (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-blue-600">Connecting...</span>
              </>
            )}
            {connectionStatus === 'connected' && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Connected</span>
              </>
            )}
            {connectionStatus === 'error' && (
              <>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">Connection Failed</span>
                <button
                  onClick={testConnectionAndLoadData}
                  className="text-red-600 underline hover:text-red-800"
                >
                  Retry
                </button>
              </>
            )}
          </div>

          {/* Add Clinic Button */}
          <button
            onClick={() => {
              resetForm();
              setEditingClinic(null);
              setShowForm(!showForm);
            }}
            disabled={connectionStatus !== 'connected'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              connectionStatus === 'connected'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Add Clinic</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clinics</p>
              <p className="text-2xl font-bold text-gray-900">{clinics.length}</p>
            </div>
            <Building className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Clinics</p>
              <p className="text-2xl font-bold text-green-600">{clinics.filter(c => c.isActive).length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Suspended</p>
              <p className="text-2xl font-bold text-red-600">{clinics.filter(c => !c.isActive).length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Clinic Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingClinic ? `Edit ${editingClinic.name}` : 'Add New Clinic'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingClinic(null);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clinic Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinic name"
                required
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinic username for login"
                required
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Region</option>
                {PHILIPPINES_REGIONS.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subscription Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Plan <span className="text-red-500">*</span>
              </label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="starter">Starter (₱{PLAN_PRICING.starter}/month - {PLAN_LIMITS.starter} cards)</option>
                <option value="growth">Growth (₱{PLAN_PRICING.growth}/month - {PLAN_LIMITS.growth} cards)</option>
                <option value="pro">Pro (₱{PLAN_PRICING.pro}/month - {PLAN_LIMITS.pro} cards)</option>
              </select>
            </div>

            {/* Area Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area Code <span className="text-red-500">*</span>
              </label>
              <select
                value={form.areaCode}
                onChange={(e) => setForm({ ...form, areaCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Area Code</option>
                {AREA_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Area Code */}
            {form.areaCode === 'Custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Area Code</label>
                <input
                  type="text"
                  value={form.customAreaCode}
                  onChange={(e) => setForm({ ...form, customAreaCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter custom area code (e.g., XYZ001)"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter clinic login password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinic address"
              />
            </div>

            {/* Admin Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Contact (Optional)</label>
              <input
                type="text"
                value={form.adminClinic}
                onChange={(e) => setForm({ ...form, adminClinic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin contact name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinic email"
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number (Optional)</label>
              <input
                type="tel"
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+63917123456"
              />
            </div>
          </div>

          {/* Plan Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <p><strong>{form.plan.charAt(0).toUpperCase() + form.plan.slice(1)} Plan:</strong> ₱{PLAN_PRICING[form.plan]}/month</p>
              <p><strong>Card Limit:</strong> Up to {PLAN_LIMITS[form.plan]} cards</p>
              <p className="text-blue-600 mt-2">* Required fields must be filled. Optional fields can be updated later.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingClinic(null);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={editingClinic ? handleUpdateClinic : handleCreateClinic}
              disabled={loading || !form.name || !form.username || !form.region || !form.areaCode || !form.password}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{editingClinic ? 'Update Clinic' : 'Create Clinic'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Clinics Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Clinic Directory</h3>
          <p className="text-sm text-gray-600">Manage all registered clinics and their details</p>
        </div>

        {clinics.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Clinics Found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first clinic to the system</p>
            <button
              onClick={() => {
                resetForm();
                setEditingClinic(null);
                setShowForm(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Clinic</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clinic Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region & Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
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
                {clinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{clinic.name}</div>
                        <div className="text-sm text-gray-500">Code: {clinic.code}</div>
                        <div className="text-sm text-gray-500">User: {clinic.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900">
                          {PHILIPPINES_REGIONS.find(r => r.code === clinic.region)?.name || clinic.region}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {clinic.plan} Plan (₱{clinic.subscriptionPrice}/mo)
                        </div>
                        <div className="text-sm text-gray-500">
                          {clinic.maxCards} cards max
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {clinic.email && (
                          <div className="flex items-center mb-1">
                            <Mail className="h-3 w-3 text-gray-400 mr-1" />
                            {clinic.email}
                          </div>
                        )}
                        {clinic.contactNumber && (
                          <div className="flex items-center mb-1">
                            <Phone className="h-3 w-3 text-gray-400 mr-1" />
                            {clinic.contactNumber}
                          </div>
                        )}
                        {clinic.address && (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500 truncate max-w-32">
                              {clinic.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          clinic.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {clinic.isActive ? 'Active' : 'Suspended'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          clinic.subscriptionStatus === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {clinic.subscriptionStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClinic(clinic)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit clinic"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClinic(clinic)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete clinic"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}