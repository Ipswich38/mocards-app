import { useState, useEffect } from 'react';
import { dbOperations, Clinic } from '../lib/supabase';

interface ClinicManagementProps {
  adminUserId: string;
}

export function ClinicManagement({ adminUserId }: ClinicManagementProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newClinic, setNewClinic] = useState({
    clinic_code: '',
    clinic_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    password: ''
  });

  const loadClinics = async () => {
    try {
      // This would typically be a custom query or RPC call
      // For now, we'll implement a basic fetch
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClinics(data || []);
    } catch (err) {
      console.error('Error loading clinics:', err);
      setError('Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      // Generate clinic code if not provided
      if (!newClinic.clinic_code) {
        const timestamp = Date.now().toString().slice(-4);
        newClinic.clinic_code = `CLINIC${timestamp}`;
      }

      // Hash password (in production, use proper bcrypt)
      const passwordHash = btoa(newClinic.password); // Base64 encoding for demo

      const clinicData = {
        clinic_code: newClinic.clinic_code,
        clinic_name: newClinic.clinic_name,
        password_hash: passwordHash,
        contact_email: newClinic.contact_email || undefined,
        contact_phone: newClinic.contact_phone || undefined,
        address: newClinic.address || undefined,
        status: 'active'
      };

      const clinic = await dbOperations.createClinic(clinicData);
      setClinics(prev => [clinic, ...prev]);
      setShowCreateForm(false);
      setNewClinic({
        clinic_code: '',
        clinic_name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        password: ''
      });
    } catch (err) {
      console.error('Error creating clinic:', err);
      setError('Failed to create clinic. Please check all fields.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Clinic Management</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gray-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-black transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Add Clinic'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateClinic} className="space-y-4 mb-8 p-4 bg-gray-50 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic Code (auto-generated if empty)
              </label>
              <input
                type="text"
                value={newClinic.clinic_code}
                onChange={(e) => setNewClinic(prev => ({ ...prev, clinic_code: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="e.g. CLINIC001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic Name *
              </label>
              <input
                type="text"
                required
                value={newClinic.clinic_name}
                onChange={(e) => setNewClinic(prev => ({ ...prev, clinic_name: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="e.g. Smile Dental Clinic"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={newClinic.password}
                onChange={(e) => setNewClinic(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="Clinic login password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={newClinic.contact_email}
                onChange={(e) => setNewClinic(prev => ({ ...prev, contact_email: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="contact@clinic.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={newClinic.contact_phone}
                onChange={(e) => setNewClinic(prev => ({ ...prev, contact_phone: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="+63 xxx xxx xxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={newClinic.address}
                onChange={(e) => setNewClinic(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors resize-none"
                rows={2}
                placeholder="Clinic address"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-black transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Clinic'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {clinics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No clinics registered yet. Add your first clinic above.
          </div>
        ) : (
          clinics.map((clinic) => (
            <div key={clinic.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{clinic.clinic_name}</div>
                  <div className="text-sm text-gray-500">Code: {clinic.clinic_code}</div>
                  {clinic.contact_email && (
                    <div className="text-sm text-gray-500">{clinic.contact_email}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs uppercase tracking-wider ${
                    clinic.status === 'active'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {clinic.status}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {new Date(clinic.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {clinic.address && (
                <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                  📍 {clinic.address}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Import supabase for direct query in loadClinics
import { supabase } from '../lib/supabase';