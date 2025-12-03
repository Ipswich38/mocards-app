import React, { useState, useEffect } from 'react';
import { productionOperations } from '../lib/production-operations';
import type { ProductionClinic, SubscriptionPlan, CreateClinicData } from '../lib/production-types';

export function ProductionClinicManagement() {
  const [clinics, setClinics] = useState<ProductionClinic[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ clinic: ProductionClinic; credentials: any } | null>(null);

  const [formData, setFormData] = useState<CreateClinicData>({
    clinic_name: '',
    owner_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    business_license: '',
    subscription_plan: 'basic'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clinicsData, plansData] = await Promise.all([
        productionOperations.getAllClinics(),
        productionOperations.getSubscriptionPlans()
      ]);
      setClinics(clinicsData);
      setSubscriptionPlans(plansData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load clinic data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const result = await productionOperations.createClinic(formData);
      setSuccess(result);
      setClinics([result.clinic, ...clinics]);
      setFormData({
        clinic_name: '',
        owner_name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        business_license: '',
        subscription_plan: 'basic'
      });
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create clinic');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (clinicId: string, newStatus: 'active' | 'suspended' | 'inactive') => {
    try {
      await productionOperations.updateClinicStatus(clinicId, newStatus);
      setClinics(clinics.map(clinic =>
        clinic.id === clinicId
          ? { ...clinic, status: newStatus, is_active: newStatus === 'active' }
          : clinic
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update clinic status');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clinic Management</h2>
            <p className="text-gray-500">Manage dental clinic partnerships and subscriptions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            + Add New Clinic
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-sm text-blue-600 font-medium">Total Clinics</div>
            <div className="text-2xl font-bold text-blue-900">{clinics.length}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-sm text-green-600 font-medium">Active Clinics</div>
            <div className="text-2xl font-bold text-green-900">
              {clinics.filter(c => c.is_active).length}
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="text-sm text-purple-600 font-medium">Monthly Revenue</div>
            <div className="text-2xl font-bold text-purple-900">
              ₱{clinics.reduce((sum, c) => sum + (c.total_revenue || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="text-sm text-orange-600 font-medium">Cards Issued</div>
            <div className="text-2xl font-bold text-orange-900">
              {clinics.reduce((sum, c) => sum + (c.cards_issued_this_month || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl">
          <div className="font-bold mb-2">🎉 Clinic Created Successfully!</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Clinic Name:</strong> {success.clinic.clinic_name}
            </div>
            <div>
              <strong>Owner:</strong> {success.clinic.owner_name}
            </div>
            <div>
              <strong>Clinic Code:</strong>
              <code className="bg-green-100 px-2 py-1 rounded ml-2 font-mono">
                {success.credentials.clinic_code}
              </code>
              <button
                onClick={() => copyToClipboard(success.credentials.clinic_code)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                📋
              </button>
            </div>
            <div>
              <strong>Password:</strong>
              <code className="bg-green-100 px-2 py-1 rounded ml-2 font-mono">
                {success.credentials.password}
              </code>
              <button
                onClick={() => copyToClipboard(success.credentials.password)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                📋
              </button>
            </div>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
          >
            Got it
          </button>
        </div>
      )}

      {/* Create Clinic Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create New Clinic</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateClinic} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clinic_name}
                    onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Bright Smiles Dental Clinic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Dr. Maria Santos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="maria@brightsmiles.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="+63 915 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="123 Main Street, Makati City, Metro Manila"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business License Number
                  </label>
                  <input
                    type="text"
                    value={formData.business_license}
                    onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="DTI-123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Plan
                  </label>
                  <select
                    value={formData.subscription_plan}
                    onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {subscriptionPlans.map(plan => (
                      <option key={plan.id} value={plan.plan_name.toLowerCase()}>
                        {plan.plan_name} - ₱{plan.price_per_month}/month ({plan.monthly_card_limit} cards)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinics List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Clinic</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Plan</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Cards</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Revenue</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{clinic.clinic_name}</div>
                      <div className="text-sm text-gray-500">
                        Code: <code className="bg-gray-100 px-1 rounded">{clinic.clinic_code}</code>
                      </div>
                      <div className="text-sm text-gray-500">Owner: {clinic.owner_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{clinic.contact_email}</div>
                    <div className="text-sm text-gray-500">{clinic.contact_phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 capitalize">{clinic.subscription_plan}</div>
                    <div className="text-sm text-gray-500">{clinic.commission_rate}% commission</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {clinic.cards_issued_this_month} / {clinic.monthly_card_limit}
                    </div>
                    <div className="text-sm text-gray-500">this month</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      ₱{clinic.total_revenue?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-500">total</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      clinic.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {clinic.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={clinic.status}
                      onChange={(e) => handleStatusChange(clinic.id, e.target.value as any)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}