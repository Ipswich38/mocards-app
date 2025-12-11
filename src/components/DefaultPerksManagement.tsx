import { useState, useEffect } from 'react';
import { streamlinedOps, DefaultPerkTemplate } from '../lib/streamlined-operations';
import { Gift, Plus, Edit2, Trash2, Save, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface DefaultPerksManagementProps {
  token: string | null;
}

export function DefaultPerksManagement({ }: DefaultPerksManagementProps) {
  const [perks, setPerks] = useState<DefaultPerkTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPerk, setEditingPerk] = useState<Partial<DefaultPerkTemplate> | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPerks();
  }, []);

  const loadPerks = async () => {
    try {
      const perkTemplates = await (streamlinedOps as any).getDefaultPerkTemplates();
      setPerks(perkTemplates);
    } catch (error) {
      console.error('Error loading perks:', error);
      setError('Failed to load perk templates');
    }
  };

  const handleSavePerk = async () => {
    if (!editingPerk || !editingPerk.perk_name || !editingPerk.perk_type || editingPerk.perk_value === undefined) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await (streamlinedOps as any).savePerkTemplate(editingPerk);

      if (success) {
        setSuccess(editingPerk.id ? 'Perk template updated successfully!' : 'Perk template created successfully!');
        setEditingPerk(null);
        await loadPerks();
      } else {
        throw new Error('Failed to save perk template');
      }
    } catch (err: any) {
      setError('Error saving perk: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerk = async (perkId: string) => {
    if (!confirm('Are you sure you want to delete this perk template?')) {
      return;
    }

    try {
      const success = await (streamlinedOps as any).deletePerkTemplate(perkId);

      if (success) {
        setSuccess('Perk template deleted successfully!');
        await loadPerks();
      } else {
        throw new Error('Failed to delete perk template');
      }
    } catch (err: any) {
      setError('Error deleting perk: ' + err.message);
    }
  };

  const createDefaultPerks = async () => {
    setLoading(true);

    const defaultPerks = [
      { perk_name: 'Free Consultation', perk_type: 'consultation', perk_value: 500, description: 'Free dental consultation', is_default: true, customizable: true, is_active: true },
      { perk_name: 'Teeth Cleaning', perk_type: 'cleaning', perk_value: 800, description: 'Professional teeth cleaning', is_default: true, customizable: true, is_active: true },
      { perk_name: 'X-Ray', perk_type: 'xray', perk_value: 1000, description: 'Dental X-ray imaging', is_default: true, customizable: true, is_active: true },
      { perk_name: 'Tooth Extraction', perk_type: 'extraction', perk_value: 1500, description: 'Tooth extraction service', is_default: true, customizable: true, is_active: true },
      { perk_name: 'Filling', perk_type: 'filling', perk_value: 1200, description: 'Dental filling service', is_default: true, customizable: true, is_active: true },
    ];

    try {
      for (const perk of defaultPerks) {
        await (streamlinedOps as any).savePerkTemplate(perk);
      }
      setSuccess('Default perks created successfully!');
      await loadPerks();
    } catch (err: any) {
      setError('Error creating default perks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="card card-hover p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Default Perks Management</h2>
            <p className="text-gray-600 text-lg">
              Manage default perk templates that will be assigned to new cards
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setEditingPerk({ is_default: false, customizable: true, is_active: true })}
              className="btn btn-primary flex items-center px-4 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Perk
            </button>
            <button
              onClick={createDefaultPerks}
              disabled={loading}
              className="btn btn-secondary flex items-center px-4 py-2"
            >
              <Gift className="h-4 w-4 mr-2" />
              Create Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Perk List */}
      <div className="card p-6">
        <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
          <Gift className="h-6 w-6 mr-3 text-blue-600" />
          Perk Templates
        </h3>

        {perks.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">No perk templates found</h4>
            <p className="text-gray-500 mb-6">Create default perks to get started.</p>
            <button
              onClick={createDefaultPerks}
              disabled={loading}
              className="btn btn-primary"
            >
              <Gift className="h-4 w-4 mr-2" />
              Create Default Perks
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map((perk) => (
              <div key={perk.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{perk.perk_name}</h4>
                    <p className="text-sm text-gray-600 capitalize">{perk.perk_type.replace('_', ' ')}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingPerk(perk)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!perk.is_default && (
                      <button
                        onClick={() => handleDeletePerk(perk.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{perk.description}</p>

                <div className="flex justify-between items-center">
                  <span className="font-mono text-lg text-blue-600">₱{perk.perk_value}</span>
                  <div className="flex space-x-2">
                    {perk.is_default && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      perk.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {perk.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editingPerk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingPerk.id ? 'Edit Perk Template' : 'Create Perk Template'}
              </h3>
              <button
                onClick={() => setEditingPerk(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perk Name *
                </label>
                <input
                  type="text"
                  value={editingPerk.perk_name || ''}
                  onChange={(e) => setEditingPerk({ ...editingPerk, perk_name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Free Consultation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perk Type *
                </label>
                <select
                  value={editingPerk.perk_type || ''}
                  onChange={(e) => setEditingPerk({ ...editingPerk, perk_type: e.target.value as any })}
                  className="input-field"
                >
                  <option value="">Select Type</option>
                  <option value="consultation">Consultation</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="xray">X-Ray</option>
                  <option value="extraction">Extraction</option>
                  <option value="filling">Filling</option>
                  <option value="service">General Service</option>
                  <option value="discount">Discount</option>
                  <option value="cashback">Cashback</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value (₱) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingPerk.perk_value || ''}
                  onChange={(e) => setEditingPerk({ ...editingPerk, perk_value: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  placeholder="500.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingPerk.description || ''}
                  onChange={(e) => setEditingPerk({ ...editingPerk, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Brief description of the perk"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingPerk.is_active || false}
                    onChange={(e) => setEditingPerk({ ...editingPerk, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingPerk.customizable || false}
                    onChange={(e) => setEditingPerk({ ...editingPerk, customizable: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Customizable</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSavePerk}
                disabled={loading}
                className="btn btn-primary flex items-center flex-1 justify-center disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingPerk(null)}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-center">
          <CheckCircle className="h-6 w-6 mr-3" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}