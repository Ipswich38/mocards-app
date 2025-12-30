import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Save,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface Clinic {
  id: string;
  code: string;
  name: string;
  email?: string;
  contact_number?: string;
  address?: string;
  region?: string;
  password?: string;
  is_active?: boolean;
  subscription_status?: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

interface ClinicFormData {
  clinic_name: string;
  clinic_code: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  region: string;
  location_code: string;
  status: 'active' | 'inactive' | 'pending';
  password?: string; // Editable password field
  temporary_password?: string;
}

export function ClinicManagementCRUD() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [stats, setStats] = useState({
    totalClinics: 0,
    activeClinics: 0,
    pendingClinics: 0,
    inactiveClinics: 0
  });

  const [formData, setFormData] = useState<ClinicFormData>({
    clinic_name: '',
    clinic_code: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    region: '',
    location_code: '',
    status: 'active',
    password: '',
    temporary_password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [clinicPasswords, setClinicPasswords] = useState<{[key: string]: string}>({});
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [clinicCodeType, setClinicCodeType] = useState<'predefined' | 'custom'>('predefined');

  const regions = [
    { code: '01', name: 'Region 01 - National Capital Region (NCR)' },
    { code: '02', name: 'Region 02 - Cordillera Administrative Region (CAR)' },
    { code: '03', name: 'Region 03 - Ilocos Region' },
    { code: '04', name: 'Region 04 - Cagayan Valley' },
    { code: '05', name: 'Region 05 - Central Luzon' },
    { code: '06', name: 'Region 06 - Bicol Region' },
    { code: '07', name: 'Region 07 - Western Visayas' },
    { code: '08', name: 'Region 08 - Central Visayas' },
    { code: '09', name: 'Region 09 - Eastern Visayas' },
    { code: '10', name: 'Region 10 - Zamboanga Peninsula' },
    { code: '11', name: 'Region 11 - Northern Mindanao' },
    { code: '12', name: 'Region 12 - Davao Region' },
    { code: '13', name: 'Region 13 - SOCCSKSARGEN' },
    { code: '14', name: 'Region 14 - Caraga' },
    { code: '15', name: 'Region 15 - Bangsamoro Autonomous Region' },
    { code: '16', name: 'Region 16 - Special Administrative Regions' },
    { code: '4A', name: 'Region 4A - CALABARZON' },
    { code: '4B', name: 'Region 4B - MIMAROPA' }
  ];

  const getClinicCodes = (locationCode: string): Record<string, { code: string; name: string; }[]> => {
    switch (locationCode) {
      case '4A': // CALABARZON
        return {
          'Cavite': Array.from({ length: 10 }, (_, i) => ({ code: `CVT${String(i + 1).padStart(3, '0')}`, name: `CVT${String(i + 1).padStart(3, '0')} - Cavite ${i + 1}` })),
          'Batangas': Array.from({ length: 10 }, (_, i) => ({ code: `BTG${String(i + 1).padStart(3, '0')}`, name: `BTG${String(i + 1).padStart(3, '0')} - Batangas ${i + 1}` })),
          'Laguna': Array.from({ length: 10 }, (_, i) => ({ code: `LGN${String(i + 1).padStart(3, '0')}`, name: `LGN${String(i + 1).padStart(3, '0')} - Laguna ${i + 1}` }))
        };
      default:
        return {};
    }
  };

  useEffect(() => {
    loadClinics();
    loadStats();
  }, [searchQuery]);

  const loadClinics = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('app_clinics.clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(
          `clinic_name.ilike.%${searchQuery}%,clinic_code.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setClinics(data || []);

      // Load existing passwords into local state for immediate display
      if (data) {
        const passwordMap: { [key: string]: string } = {};
        data.forEach(clinic => {
          if (clinic.current_password) {
            passwordMap[clinic.id] = clinic.current_password;
          }
        });
        setClinicPasswords(prev => ({ ...prev, ...passwordMap }));
      }
    } catch (err: any) {
      setError('Failed to load clinics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [totalResult, activeResult, pendingResult, inactiveResult] = await Promise.all([
        supabase.from('app_clinics.clinics').select('*', { count: 'exact', head: true }),
        supabase.from('app_clinics.clinics').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('app_clinics.clinics').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('app_clinics.clinics').select('*', { count: 'exact', head: true }).eq('status', 'inactive')
      ]);

      setStats({
        totalClinics: totalResult.count || 0,
        activeClinics: activeResult.count || 0,
        pendingClinics: pendingResult.count || 0,
        inactiveClinics: inactiveResult.count || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingClinic) {
        // Update existing clinic with optional password update
        const updateData = { ...formData };
        delete updateData.temporary_password; // Don't update password in edit mode

        // Prepare update object
        let updateObject: any = {
          name: updateData.clinic_name,
          code: updateData.clinic_code,
          email: updateData.contact_email,
          contact_number: updateData.contact_phone,
          address: updateData.address,
          region: updateData.region,
          is_active: updateData.status === 'active',
          subscription_status: updateData.status,
          updated_at: new Date().toISOString()
        };

        // If password is provided, hash it and update
        if (formData.password && formData.password.trim()) {
          const passwordHash = await bcrypt.hash(formData.password, 10);
          updateObject.password = passwordHash;

          // Update the local clinic passwords for immediate display
          setClinicPasswords(prev => ({
            ...prev,
            [editingClinic.id]: formData.password!
          }));
        }

        const { error } = await supabase
          .from('app_clinics.clinics')
          .update(updateObject)
          .eq('id', editingClinic.id);

        if (error) throw error;
        setSuccess('Clinic updated successfully!' + (formData.password ? ' Password has been updated.' : ''));
      } else {
        // Create new clinic with hashed password
        if (!formData.temporary_password?.trim()) {
          setError('Temporary password is required');
          return;
        }

        const passwordHash = await bcrypt.hash(formData.temporary_password, 10);

        // Store the temporary password for admin reference
        const tempPassword = formData.temporary_password;

        console.log('Creating clinic with data:', {
          clinic_name: formData.clinic_name,
          clinic_code: formData.clinic_code,
          email: formData.contact_email, // Fixed field mapping
          phone: formData.contact_phone, // Fixed field mapping
          address: formData.address,
          region: formData.region,
          location_code: formData.location_code,
          status: formData.status,
          password_hash: passwordHash ? '[HASHED]' : '[MISSING]',
          password_must_be_changed: true
        });

        const { data, error } = await supabase
          .from('app_clinics.clinics')
          .insert({
            name: formData.clinic_name,
            code: formData.clinic_code,
            email: formData.contact_email,
            contact_number: formData.contact_phone,
            address: formData.address,
            region: formData.region,
            password: passwordHash,
            is_active: formData.status === 'active',
            subscription_status: formData.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select(); // Return the inserted data

        console.log('Clinic creation result:', { data, error });

        if (error) {
          console.error('Database error details:', error);
          throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
        }

        if (data && data.length > 0) {
          console.log('Clinic successfully created:', data[0]);
          // Store the temporary password for this clinic
          setClinicPasswords(prev => ({
            ...prev,
            [data[0].id]: tempPassword
          }));
          setSuccess(`Clinic '${data[0].name}' created successfully with code '${data[0].code}' and temporary password: ${tempPassword}`);
        } else {
          throw new Error('Clinic creation appeared successful but no data returned');
        }
      }

      resetForm();
      loadClinics();
      loadStats();
    } catch (err: any) {
      console.error('Clinic creation failed:', err);
      setError('Failed to save clinic: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormData({
      clinic_name: clinic.name,
      clinic_code: clinic.code,
      contact_email: clinic.email || '',
      contact_phone: clinic.contact_number || '',
      address: clinic.address || '',
      region: clinic.region || '',
      location_code: '',
      status: clinic.is_active ? 'active' : 'inactive',
      password: '',
      temporary_password: ''
    });

    // Reset province and clinic code type
    setSelectedProvince('');
    setClinicCodeType('predefined');

    setShowForm(true);
  };

  const handleDelete = async (clinic: Clinic) => {
    if (!confirm(`Are you sure you want to delete "${clinic.name}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_clinics.clinics')
        .delete()
        .eq('id', clinic.id);

      if (error) throw error;
      setSuccess('Clinic deleted successfully!');
      loadClinics();
      loadStats();
    } catch (err: any) {
      setError('Failed to delete clinic: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clinic_name: '',
      clinic_code: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      region: '',
      location_code: '',
      status: 'active',
      password: '',
      temporary_password: ''
    });
    setSelectedProvince('');
    setClinicCodeType('predefined');
    setEditingClinic(null);
    setShowForm(false);
  };

  const generateClinicCode = () => {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `C${timestamp}${random}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: Check },
      pending: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertCircle },
      inactive: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: X }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`${config.bg} ${config.text} ${config.border} text-xs px-3 py-1.5 rounded-xl font-medium flex items-center border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Clinic Management</h2>
            <p className="text-gray-600">
              Manage clinic registrations, credentials, and regional assignments
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, clinic_code: generateClinicCode() }));
                setShowForm(true);
              }}
              className="bg-[#1A535C] text-white rounded-xl shadow-md hover:shadow-lg font-bold px-4 py-2 flex items-center transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Clinic
            </button>
            <button
              onClick={() => { loadClinics(); loadStats(); }}
              disabled={loading}
              className="bg-white text-[#1A535C] rounded-xl shadow-md hover:shadow-lg font-bold px-4 py-2 flex items-center disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <div className="flex items-center">
            <div className="p-3 rounded-2xl bg-blue-50">
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Clinics</p>
              <p className="text-2xl font-bold text-blue-500">{stats.totalClinics}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <div className="flex items-center">
            <div className="p-3 rounded-2xl bg-green-50">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active</p>
              <p className="text-2xl font-bold text-green-500">{stats.activeClinics}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <div className="flex items-center">
            <div className="p-3 rounded-2xl bg-orange-50">
              <AlertCircle className="h-6 w-6 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl font-bold text-orange-500">{stats.pendingClinics}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <div className="flex items-center">
            <div className="p-3 rounded-2xl bg-red-50">
              <X className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Inactive</p>
              <p className="text-2xl font-bold text-red-500">{stats.inactiveClinics}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search clinics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl flex items-center">
          <Check className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="p-2 rounded-2xl bg-blue-50 mr-3">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  {editingClinic ? 'Edit Clinic' : 'Add New Clinic'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.clinic_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, clinic_name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      placeholder="Enter clinic name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.clinic_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, clinic_code: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      placeholder="Enter clinic code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      placeholder="clinic@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      placeholder="(02) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                    rows={3}
                    placeholder="Enter clinic address"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region/Location Code
                    </label>
                    <select
                      value={formData.location_code}
                      onChange={(e) => {
                        const selectedRegion = regions.find(r => r.code === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          location_code: e.target.value,
                          region: selectedRegion?.name || ''
                        }));
                        setSelectedProvince(''); // Reset province selection
                        setClinicCodeType('predefined'); // Reset clinic code type
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                    >
                      <option value="">Select Region</option>
                      {regions.map(region => (
                        <option key={region.code} value={region.code}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Clinic Code Selection - CALABARZON Region */}
                {formData.location_code === '4A' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Province (CALABARZON)
                      </label>
                      <select
                        value={selectedProvince}
                        onChange={(e) => {
                          setSelectedProvince(e.target.value);
                          setFormData(prev => ({ ...prev, clinic_code: '' })); // Reset clinic code when province changes
                        }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      >
                        <option value="">Select Province</option>
                        <option value="Cavite">Cavite</option>
                        <option value="Batangas">Batangas</option>
                        <option value="Laguna">Laguna</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clinic Code Type
                      </label>
                      <select
                        value={clinicCodeType}
                        onChange={(e) => {
                          setClinicCodeType(e.target.value as 'predefined' | 'custom');
                          setFormData(prev => ({ ...prev, clinic_code: '' })); // Reset clinic code when type changes
                        }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      >
                        <option value="predefined">Predefined Codes</option>
                        <option value="custom">Custom Code</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Predefined Clinic Code Dropdown */}
                {formData.location_code === '4A' && selectedProvince && clinicCodeType === 'predefined' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic Code ({selectedProvince})
                    </label>
                    <select
                      value={formData.clinic_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, clinic_code: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                    >
                      <option value="">Select Clinic Code</option>
                      {getClinicCodes(formData.location_code)[selectedProvince]?.map(clinic => (
                        <option key={clinic.code} value={clinic.code}>
                          {clinic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom Clinic Code Input */}
                {formData.location_code === '4A' && clinicCodeType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Clinic Code
                    </label>
                    <input
                      type="text"
                      value={formData.clinic_code}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setFormData(prev => ({ ...prev, clinic_code: value }));
                      }}
                      placeholder="Enter custom clinic code (e.g., CUST001)"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use format: XXX### (e.g., CUST001, SPEC002)
                    </p>
                  </div>
                )}

                {/* Default Clinic Code for Other Regions */}
                {formData.location_code && formData.location_code !== '4A' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic Code
                    </label>
                    <input
                      type="text"
                      value={formData.clinic_code}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setFormData(prev => ({ ...prev, clinic_code: value }));
                      }}
                      placeholder={`Enter clinic code for ${formData.region}`}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Custom clinic code for this region (e.g., {formData.location_code}001)
                    </p>
                  </div>
                )}

                {!editingClinic && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temporary Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required={!editingClinic}
                        value={formData.temporary_password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, temporary_password: e.target.value }))}
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                        placeholder="Enter temporary password for clinic access"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Clinic will be prompted to change this password on first login
                    </p>
                  </div>
                )}

                {editingClinic && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                        placeholder="Enter new password (leave blank to keep current)"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Update the clinic's login password. Leave blank to keep current password.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-white text-gray-700 rounded-xl border border-gray-200 shadow-sm hover:shadow-md font-bold px-6 py-2 transition-all hover:scale-[1.02]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#1A535C] text-white rounded-xl shadow-md hover:shadow-lg font-bold px-6 py-2 disabled:opacity-50 transition-all hover:scale-[1.02] flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : (editingClinic ? 'Update' : 'Create')} Clinic
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Clinics Table */}
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-gray-600">Loading clinics...</span>
                    </div>
                  </td>
                </tr>
              ) : clinics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No clinics found.</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-[#1A535C] text-white rounded-xl shadow-md hover:shadow-lg font-bold px-6 py-2 mt-4 transition-all hover:scale-[1.02]"
                    >
                      Add First Clinic
                    </button>
                  </td>
                </tr>
              ) : (
                clinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{clinic.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{clinic.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {clinic.email && (
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {clinic.email}
                          </div>
                        )}
                        {clinic.contact_number && (
                          <div className="flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {clinic.contact_number}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {clinic.region && (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {clinic.region}
                          </div>
                        )}
                      </div>
                      {/* Show password if requested */}
                      {showPasswordFor === clinic.id && clinicPasswords[clinic.id] && (
                        <div className="mt-2 p-2 rounded text-xs" style={{
                          backgroundColor: 'var(--md-sys-color-warning-container)',
                          border: '1px solid var(--md-sys-color-warning)',
                          color: 'var(--md-sys-color-on-warning-container)'
                        }}>
                          <strong>Temp Password:</strong> {clinicPasswords[clinic.id]}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(clinic.is_active ? 'active' : 'inactive')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {showPasswordFor === clinic.id && clinicPasswords[clinic.id] ? (
                          <div className="px-3 py-1 rounded-md text-xs font-mono" style={{
                            backgroundColor: 'var(--md-sys-color-warning-container)',
                            color: 'var(--md-sys-color-on-warning-container)',
                            border: '1px solid var(--md-sys-color-warning)'
                          }}>
                            {clinicPasswords[clinic.id]}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">••••••••</div>
                        )}
                        <button
                          onClick={() => setShowPasswordFor(showPasswordFor === clinic.id ? null : clinic.id)}
                          style={{ color: 'var(--md-sys-color-accent-yellow)' }}
                          className="hover:opacity-80"
                          title="Toggle password visibility"
                        >
                          {showPasswordFor === clinic.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(clinic.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(clinic)}
                        style={{ color: 'var(--md-sys-color-accent-orange)' }}
                        className="hover:opacity-80"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(clinic)}
                        style={{ color: '#ef4444' }}
                        className="hover:opacity-80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}