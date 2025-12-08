import { useState, useEffect } from 'react';
import {
  dbOperations,
  ClinicPerkCustomization as PerkCustomization,
  PerkTemplate
} from '../lib/supabase';
import { Edit, Save, X, Toggle, Calendar, DollarSign, FileText, Settings } from 'lucide-react';

interface ClinicPerkCustomizationProps {
  clinicId: string;
  clinicName: string;
}

export function ClinicPerkCustomization({ clinicId, clinicName }: ClinicPerkCustomizationProps) {
  const [customizations, setCustomizations] = useState<PerkCustomization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Edit form state
  const [editingPerk, setEditingPerk] = useState<PerkCustomization | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    custom_name: '',
    custom_description: '',
    custom_value: 0,
    is_enabled: true,
    requires_appointment: false,
    max_redemptions_per_card: 1,
    valid_from: '',
    valid_until: '',
    terms_and_conditions: ''
  });

  useEffect(() => {
    loadCustomizations();
  }, [clinicId]);

  const loadCustomizations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dbOperations.getClinicPerkCustomizations(clinicId);
      setCustomizations(data);
    } catch (err) {
      console.error('Error loading perk customizations:', err);
      setError('Failed to load perk customizations');
    } finally {
      setLoading(false);
    }
  };

  const resetEditForm = () => {
    setEditForm({
      custom_name: '',
      custom_description: '',
      custom_value: 0,
      is_enabled: true,
      requires_appointment: false,
      max_redemptions_per_card: 1,
      valid_from: '',
      valid_until: '',
      terms_and_conditions: ''
    });
    setEditingPerk(null);
  };

  const handleEditPerk = (customization: PerkCustomization) => {
    setEditingPerk(customization);
    setEditForm({
      custom_name: customization.custom_name || customization.perk_template?.name || '',
      custom_description: customization.custom_description || customization.perk_template?.description || '',
      custom_value: customization.custom_value || customization.perk_template?.default_value || 0,
      is_enabled: customization.is_enabled,
      requires_appointment: customization.requires_appointment,
      max_redemptions_per_card: customization.max_redemptions_per_card,
      valid_from: customization.valid_from || '',
      valid_until: customization.valid_until || '',
      terms_and_conditions: customization.terms_and_conditions || ''
    });
    setShowEditForm(true);
  };

  const handleUpdatePerk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerk) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.updateClinicPerkCustomization(editingPerk.id, editForm);
      setSuccess('Perk customization updated successfully!');
      setShowEditForm(false);
      resetEditForm();
      loadCustomizations();
    } catch (err) {
      console.error('Error updating perk customization:', err);
      setError('Failed to update perk customization');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePerkStatus = async (customization: PerkCustomization) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.updateClinicPerkCustomization(customization.id, {
        is_enabled: !customization.is_enabled
      });
      setSuccess(`Perk ${customization.is_enabled ? 'disabled' : 'enabled'} successfully!`);
      loadCustomizations();
    } catch (err) {
      console.error('Error toggling perk status:', err);
      setError('Failed to update perk status');
    } finally {
      setLoading(false);
    }
  };

  const getIconDisplay = (iconName?: string) => {
    if (!iconName) return '📋';
    const iconMap: Record<string, string> = {
      'stethoscope': '🩺',
      'sparkles': '✨',
      'scissors': '✂️',
      'shield': '🛡️',
      'sun': '☀️',
      'camera': '📷',
      'smile': '😊',
      'grid': '⚿',
      'disc': '💿',
      'activity': '📊'
    };
    return iconMap[iconName] || '📋';
  };

  const filteredCustomizations = customizations.filter(custom => {
    const matchesSearch =
      (custom.custom_name || custom.perk_template?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (custom.custom_description || custom.perk_template?.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (custom.perk_template?.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && custom.is_enabled) ||
      (filterEnabled === 'disabled' && !custom.is_enabled);

    return matchesSearch && matchesFilter;
  });

  const enabledCount = customizations.filter(c => c.is_enabled).length;
  const totalCount = customizations.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Perk Customization</h3>
            <p className="text-sm text-gray-600 mt-1">
              Customize perks for {clinicName} • {enabledCount} of {totalCount} perks enabled
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm mb-4 border border-green-100">
            {success}
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search perks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value as 'all' | 'enabled' | 'disabled')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Perks</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>

        {/* Perks List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading perks...</div>
          ) : filteredCustomizations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || filterEnabled !== 'all' ? 'No perks match your criteria.' : 'No perks available.'}
            </div>
          ) : (
            filteredCustomizations.map((customization) => (
              <div
                key={customization.id}
                className={`border rounded-lg p-4 transition-colors ${
                  customization.is_enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{getIconDisplay(customization.perk_template?.icon)}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {customization.custom_name || customization.perk_template?.name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Type: {customization.perk_template?.perk_type}</span>
                          <span>Value: ₱{(customization.custom_value || customization.perk_template?.default_value || 0).toLocaleString()}</span>
                          {customization.perk_template?.category && (
                            <span>Category: {customization.perk_template.category}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {(customization.custom_description || customization.perk_template?.description) && (
                      <p className="text-sm text-gray-600 mb-3">
                        {customization.custom_description || customization.perk_template?.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          customization.is_enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {customization.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      {customization.requires_appointment && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Calendar size={12} />
                          Requires Appointment
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <DollarSign size={12} />
                        Max: {customization.max_redemptions_per_card} per card
                      </div>

                      {(customization.valid_from || customization.valid_until) && (
                        <div className="text-xs text-gray-600">
                          Valid: {customization.valid_from ? new Date(customization.valid_from).toLocaleDateString() : 'Always'} -
                          {customization.valid_until ? new Date(customization.valid_until).toLocaleDateString() : 'Forever'}
                        </div>
                      )}
                    </div>

                    {customization.terms_and_conditions && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-1 text-xs font-medium text-blue-900 mb-1">
                          <FileText size={12} />
                          Terms & Conditions
                        </div>
                        <p className="text-xs text-blue-700">{customization.terms_and_conditions}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleTogglePerkStatus(customization)}
                      disabled={loading}
                      className={`p-2 rounded-lg transition-colors ${
                        customization.is_enabled
                          ? 'text-orange-600 hover:bg-orange-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={customization.is_enabled ? 'Disable perk' : 'Enable perk'}
                    >
                      <Toggle size={16} />
                    </button>
                    <button
                      onClick={() => handleEditPerk(customization)}
                      disabled={loading}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Customize perk"
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && editingPerk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Customize: {editingPerk.perk_template?.name}
              </h3>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  resetEditForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdatePerk} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Name</label>
                  <input
                    type="text"
                    value={editForm.custom_name}
                    onChange={(e) => setEditForm({...editForm, custom_name: e.target.value})}
                    placeholder={editingPerk.perk_template?.name}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Value (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.custom_value}
                    onChange={(e) => setEditForm({...editForm, custom_value: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Description</label>
                <textarea
                  value={editForm.custom_description}
                  onChange={(e) => setEditForm({...editForm, custom_description: e.target.value})}
                  placeholder={editingPerk.perk_template?.description}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Redemptions Per Card</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editForm.max_redemptions_per_card}
                    onChange={(e) => setEditForm({...editForm, max_redemptions_per_card: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_enabled}
                      onChange={(e) => setEditForm({...editForm, is_enabled: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Enabled</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.requires_appointment}
                      onChange={(e) => setEditForm({...editForm, requires_appointment: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Requires Appointment</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From (Optional)</label>
                  <input
                    type="date"
                    value={editForm.valid_from}
                    onChange={(e) => setEditForm({...editForm, valid_from: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until (Optional)</label>
                  <input
                    type="date"
                    value={editForm.valid_until}
                    onChange={(e) => setEditForm({...editForm, valid_until: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions (Optional)</label>
                <textarea
                  value={editForm.terms_and_conditions}
                  onChange={(e) => setEditForm({...editForm, terms_and_conditions: e.target.value})}
                  placeholder="Enter any specific terms and conditions for this perk..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Save Customization
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    resetEditForm();
                  }}
                  className="px-6 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}