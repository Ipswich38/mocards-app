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
  clinic_code: string;
  clinic_name: string;
  email?: string; // Fixed field name to match database
  phone?: string; // Fixed field name to match database
  contact_email?: string; // Keep for backward compatibility
  contact_phone?: string; // Keep for backward compatibility
  address?: string;
  status: string;
  region?: string;
  location_code?: string;
  current_password?: string; // Current active password
  password_hash?: string; // Stored password hash
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

  const regions = [
    { code: '01', name: 'National Capital Region (NCR)' },
    { code: '02', name: 'Cordillera Administrative Region (CAR)' },
    { code: '03', name: 'Region I (Ilocos Region)' },
    { code: '04', name: 'Region II (Cagayan Valley)' },
    { code: '05', name: 'Region III (Central Luzon)' },
    { code: '06', name: 'Region IV-A (CALABARZON)' },
    { code: '07', name: 'Region IV-B (MIMAROPA)' },
    { code: '08', name: 'Region V (Bicol Region)' },
    { code: '09', name: 'Region VI (Western Visayas)' },
    { code: '10', name: 'Region VII (Central Visayas)' },
    { code: '11', name: 'Region VIII (Eastern Visayas)' },
    { code: '12', name: 'Region IX (Zamboanga Peninsula)' },
    { code: '13', name: 'Region X (Northern Mindanao)' },
    { code: '14', name: 'Region XI (Davao Region)' },
    { code: '15', name: 'Region XII (SOCCSKSARGEN)' },
    { code: '16', name: 'Region XIII (Caraga)' }
  ];

  useEffect(() => {
    loadClinics();
    loadStats();
  }, [searchQuery]);

  const loadClinics = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('mocards_clinics')
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
        supabase.from('mocards_clinics').select('*', { count: 'exact', head: true }),
        supabase.from('mocards_clinics').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('mocards_clinics').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('mocards_clinics').select('*', { count: 'exact', head: true }).eq('status', 'inactive')
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
          clinic_name: updateData.clinic_name,
          clinic_code: updateData.clinic_code,
          email: updateData.contact_email,
          phone: updateData.contact_phone,
          address: updateData.address,
          region: updateData.region,
          location_code: updateData.location_code,
          status: updateData.status,
          updated_at: new Date().toISOString()
        };

        // If password is provided, hash it and update
        if (formData.password && formData.password.trim()) {
          const passwordHash = await bcrypt.hash(formData.password, 10);
          updateObject.password_hash = passwordHash;
          updateObject.current_password = formData.password;

          // Update the local clinic passwords for immediate display
          setClinicPasswords(prev => ({
            ...prev,
            [editingClinic.id]: formData.password!
          }));
        }

        const { error } = await supabase
          .from('mocards_clinics')
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
          .from('mocards_clinics')
          .insert({
            clinic_name: formData.clinic_name,
            clinic_code: formData.clinic_code,
            email: formData.contact_email, // Fixed field mapping
            phone: formData.contact_phone, // Fixed field mapping
            address: formData.address,
            region: formData.region,
            location_code: formData.location_code,
            status: formData.status,
            password_hash: passwordHash,
            current_password: tempPassword, // Store the actual password for admin visibility
            password_must_be_changed: true,
            first_login: true,
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
          setSuccess(`Clinic '${data[0].clinic_name}' created successfully with code '${data[0].clinic_code}' and temporary password: ${tempPassword}`);
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
      clinic_name: clinic.clinic_name,
      clinic_code: clinic.clinic_code,
      contact_email: (clinic as any).email || '', // Fixed field mapping
      contact_phone: (clinic as any).phone || '', // Fixed field mapping
      address: clinic.address || '',
      region: clinic.region || '',
      location_code: clinic.location_code || '',
      status: clinic.status as any,
      password: clinicPasswords[clinic.id] || clinic.current_password || '', // Load current password
      temporary_password: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (clinic: Clinic) => {
    if (!confirm(`Are you sure you want to delete "${clinic.clinic_name}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mocards_clinics')
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
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      inactive: { bg: 'bg-red-100', text: 'text-red-800', icon: X }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`${config.bg} ${config.text} text-xs px-2 py-1 rounded-full font-medium flex items-center`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
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
              className="btn btn-primary flex items-center px-4 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Clinic
            </button>
            <button
              onClick={() => { loadClinics(); loadStats(); }}
              disabled={loading}
              className="btn btn-outline flex items-center px-4 py-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clinics</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClinics}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeClinics}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingClinics}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inactiveClinics}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search clinics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <Check className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingClinic ? 'Edit Clinic' : 'Add New Clinic'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
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
                      className="input-field"
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
                      className="input-field"
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
                      className="input-field"
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
                      className="input-field"
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
                    className="input-field"
                    rows={3}
                    placeholder="Enter clinic address"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region
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
                      }}
                      className="input-field"
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
                      className="input-field"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

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
                        className="input-field pr-10"
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
                        className="input-field pr-10"
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
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary disabled:opacity-50"
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
      <div className="card overflow-hidden">
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
                      className="btn btn-primary mt-4"
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
                        <div className="text-sm font-medium text-gray-900">{clinic.clinic_name}</div>
                        <div className="text-sm text-gray-500 font-mono">{clinic.clinic_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {((clinic as any).email || clinic.contact_email) && (
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {(clinic as any).email || clinic.contact_email}
                          </div>
                        )}
                        {((clinic as any).phone || clinic.contact_phone) && (
                          <div className="flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {(clinic as any).phone || clinic.contact_phone}
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
                        {clinic.location_code && (
                          <div className="text-xs text-gray-500">Code: {clinic.location_code}</div>
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
                      {getStatusBadge(clinic.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {showPasswordFor === clinic.id && (clinicPasswords[clinic.id] || clinic.current_password) ? (
                          <div className="px-3 py-1 rounded-md text-xs font-mono" style={{
                            backgroundColor: 'var(--md-sys-color-warning-container)',
                            color: 'var(--md-sys-color-on-warning-container)',
                            border: '1px solid var(--md-sys-color-warning)'
                          }}>
                            {clinicPasswords[clinic.id] || clinic.current_password}
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