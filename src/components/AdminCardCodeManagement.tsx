import { useState, useEffect } from 'react';
import {
  dbOperations,
  CodeGenerationSettings,
  LocationCode,
  Card,
  CardCodeHistory,
  SystemVersion,
  CardBatch
} from '../lib/supabase';
import {
  Settings,
  Code,
  MapPin,
  History,
  Save,
  Plus,
  Edit,
  Download,
  AlertCircle,
  CheckCircle,
  Hash,
  Database,
  Clock,
  BarChart3
} from 'lucide-react';

interface AdminCardCodeManagementProps {
  adminId: string;
}

interface EnhancedCardBatch extends CardBatch {
  generation_settings?: Record<string, any>;
  custom_prefix?: string;
  sequence_start?: number;
  sequence_end?: number;
  location_code?: string;
  admin_notes?: string;
  updated_by?: string;
  updated_at?: string;
}

export function AdminCardCodeManagement({ adminId }: AdminCardCodeManagementProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'locations' | 'generation' | 'history' | 'analytics'>('settings');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Settings State
  const [codeSettings, setCodeSettings] = useState<CodeGenerationSettings[]>([]);
  const [locationCodes, setLocationCodes] = useState<LocationCode[]>([]);
  const [systemVersions, setSystemVersions] = useState<SystemVersion[]>([]);

  // Form States
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingSettings, setEditingSettings] = useState<CodeGenerationSettings | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationCode | null>(null);

  // Settings Form
  const [settingsForm, setSettingsForm] = useState({
    setting_type: 'batch' as CodeGenerationSettings['setting_type'],
    generation_mode: 'auto' as CodeGenerationSettings['generation_mode'],
    pattern_template: '',
    location_prefix: 'PHL',
    auto_range_start: 1,
    auto_range_end: 999,
    current_sequence: 1,
    is_active: true,
    metadata: {}
  });

  // Location Form
  const [locationForm, setLocationForm] = useState({
    code: '',
    location_name: '',
    description: '',
    is_active: true,
    sort_order: 0
  });

  // Card Generation State
  const [generationForm, setGenerationForm] = useState({
    batch_id: '',
    count: 10,
    generationMode: 'auto' as 'auto' | 'manual' | 'range',
    locationCode: 'PHL',
    customPrefix: '',
    startIndex: 1,
    endIndex: 100
  });

  const [batches, setBatches] = useState<EnhancedCardBatch[]>([]);
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [cardHistory, setCardHistory] = useState<CardCodeHistory[]>([]);

  useEffect(() => {
    loadData();
    // Set up auto-refresh every 30 seconds to check for updates
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsData, locationsData, versionsData, batchesData] = await Promise.all([
        dbOperations.getCodeGenerationSettings(),
        dbOperations.getAllLocationCodes(),
        dbOperations.getSystemVersions(),
        loadCardBatches()
      ]);

      setCodeSettings(settingsData);
      setLocationCodes(locationsData);
      setSystemVersions(versionsData);
      setBatches(batchesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load card management data');
    } finally {
      setLoading(false);
    }
  };

  const loadCardBatches = async () => {
    // Use a direct supabase call since we need to access card_batches directly
    try {
      // This would be replaced with proper dbOperations method
      const batches = await dbOperations.getAllCardBatches();
      return batches as EnhancedCardBatch[];
    } catch (error) {
      console.error('Error loading card batches:', error);
      throw error;
    }
  };

  const checkForUpdates = async () => {
    try {
      const newVersions = await dbOperations.getSystemVersions();
      let hasUpdates = false;

      for (const newVersion of newVersions) {
        const currentVersion = systemVersions.find(v => v.component === newVersion.component);
        if (!currentVersion || currentVersion.version_number < newVersion.version_number) {
          hasUpdates = true;
          break;
        }
      }

      if (hasUpdates) {
        setSuccess('System updated! New changes detected.');
        setSystemVersions(newVersions);
        // Reload specific data based on what changed
        await loadData();
      }
    } catch (err) {
      // Silently fail for auto-refresh
      console.warn('Auto-refresh failed:', err);
    }
  };

  // Save form state automatically
  const saveFormState = async (componentName: string, formData: Record<string, any>) => {
    try {
      await dbOperations.saveUserSessionState(adminId, 'admin', componentName, formData, {});
    } catch (err) {
      console.warn('Failed to save form state:', err);
    }
  };

  // Form state management (loadFormState removed as it was unused)

  const handleCreateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.createCodeGenerationSetting({
        ...settingsForm,
        created_by: adminId
      });

      setSuccess('Code generation settings created successfully!');
      setShowSettingsForm(false);
      resetSettingsForm();
      loadData();
    } catch (err: any) {
      console.error('Error creating settings:', err);
      setError(err.message || 'Failed to create settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSettings) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.updateCodeGenerationSetting(editingSettings.id, settingsForm);
      setSuccess('Settings updated successfully!');
      setShowSettingsForm(false);
      resetSettingsForm();
      loadData();
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.createLocationCode({
        ...locationForm,
        created_by: adminId
      });

      setSuccess('Location code created successfully!');
      setShowLocationForm(false);
      resetLocationForm();
      loadData();
    } catch (err: any) {
      console.error('Error creating location:', err);
      setError(err.message || 'Failed to create location code');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.updateLocationCode(editingLocation.id, locationForm);
      setSuccess('Location code updated successfully!');
      setShowLocationForm(false);
      resetLocationForm();
      loadData();
    } catch (err: any) {
      console.error('Error updating location:', err);
      setError(err.message || 'Failed to update location code');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generationForm.batch_id) {
      setError('Please select a batch');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const cards = await dbOperations.generateCardsWithSettings(
        generationForm.batch_id,
        generationForm.count,
        {
          generationMode: generationForm.generationMode,
          locationCode: generationForm.locationCode,
          customPrefix: generationForm.customPrefix || undefined,
          startIndex: generationForm.startIndex,
          endIndex: generationForm.endIndex
        },
        adminId
      );

      setGeneratedCards(cards);
      setSuccess(`Successfully generated ${cards.length} cards!`);

      // Save form state
      await saveFormState('card_generation', generationForm);
    } catch (err: any) {
      console.error('Error generating cards:', err);
      setError(err.message || 'Failed to generate cards');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadCardHistory = async (cardId: string) => {
    setLoading(true);
    try {
      const history = await dbOperations.getCardCodeHistory(cardId);
      setCardHistory(history);
    } catch (err: any) {
      console.error('Error loading card history:', err);
      setError('Failed to load card history');
    } finally {
      setLoading(false);
    }
  };

  const resetSettingsForm = () => {
    setSettingsForm({
      setting_type: 'batch',
      generation_mode: 'auto',
      pattern_template: '',
      location_prefix: 'PHL',
      auto_range_start: 1,
      auto_range_end: 999,
      current_sequence: 1,
      is_active: true,
      metadata: {}
    });
    setEditingSettings(null);
  };

  const resetLocationForm = () => {
    setLocationForm({
      code: '',
      location_name: '',
      description: '',
      is_active: true,
      sort_order: 0
    });
    setEditingLocation(null);
  };

  const handleEditSettings = (settings: CodeGenerationSettings) => {
    setEditingSettings(settings);
    setSettingsForm({
      setting_type: settings.setting_type,
      generation_mode: settings.generation_mode,
      pattern_template: settings.pattern_template || '',
      location_prefix: settings.location_prefix || 'PHL',
      auto_range_start: settings.auto_range_start || 1,
      auto_range_end: settings.auto_range_end || 999,
      current_sequence: settings.current_sequence,
      is_active: settings.is_active,
      metadata: settings.metadata
    });
    setShowSettingsForm(true);
  };

  const handleEditLocation = (location: LocationCode) => {
    setEditingLocation(location);
    setLocationForm({
      code: location.code,
      location_name: location.location_name,
      description: location.description || '',
      is_active: location.is_active,
      sort_order: location.sort_order
    });
    setShowLocationForm(true);
  };

  const downloadCardsCSV = () => {
    if (generatedCards.length === 0) {
      setError('No cards to download');
      return;
    }

    const csvContent = [
      ['Control Number', 'Passcode', 'Location Code', 'Status', 'Generated At'],
      ...generatedCards.map(card => [
        card.control_number,
        card.passcode,
        card.location_code,
        card.status,
        card.created_at
      ])
    ].map(row => row.join(',')).join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated_cards_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Card Code Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Admin superpower controls for all card numbers, codes, and generation
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock size={14} className="text-gray-400" />
            <span className="text-gray-500">
              System v{systemVersions.find(v => v.component === 'cards')?.version_number || 1}
            </span>
          </div>
        </div>

        {/* Version Update Notification */}
        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm mb-4 border border-green-100 flex items-center gap-2">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4 border border-red-100 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'settings', label: 'Generation Settings', icon: Settings },
            { key: 'locations', label: 'Location Codes', icon: MapPin },
            { key: 'generation', label: 'Card Generation', icon: Code },
            { key: 'history', label: 'Change History', icon: History },
            { key: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Code Generation Settings</h4>
              <button
                onClick={() => setShowSettingsForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                New Setting
              </button>
            </div>

            <div className="space-y-3">
              {codeSettings.map((setting) => (
                <div key={setting.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {setting.setting_type}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {setting.generation_mode}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          setting.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {setting.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {setting.pattern_template && (
                        <p className="text-sm text-gray-600 font-mono">
                          Pattern: {setting.pattern_template}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span>Sequence: {setting.current_sequence}</span>
                        {setting.auto_range_start && setting.auto_range_end && (
                          <span>Range: {setting.auto_range_start}-{setting.auto_range_end}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditSettings(setting)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit setting"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Codes Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Location Codes</h4>
              <button
                onClick={() => setShowLocationForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                New Location
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locationCodes.map((location) => (
                <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-blue-600">
                        {location.code}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        location.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleEditLocation(location)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit location"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                  <h5 className="font-medium text-gray-900 mb-1">{location.location_name}</h5>
                  {location.description && (
                    <p className="text-sm text-gray-600">{location.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Generation Tab */}
        {activeTab === 'generation' && (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900">Generate Cards with Advanced Controls</h4>

            <form onSubmit={handleGenerateCards} className="space-y-4 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                  <select
                    value={generationForm.batch_id}
                    onChange={(e) => setGenerationForm({...generationForm, batch_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select batch...</option>
                    {batches.map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_number} ({batch.total_cards} cards)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Count *</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={generationForm.count}
                    onChange={(e) => setGenerationForm({...generationForm, count: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Generation Mode *</label>
                  <select
                    value={generationForm.generationMode}
                    onChange={(e) => setGenerationForm({...generationForm, generationMode: e.target.value as any})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="auto">Auto Generate</option>
                    <option value="manual">Manual Format</option>
                    <option value="range">Range Based</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Code *</label>
                  <select
                    value={generationForm.locationCode}
                    onChange={(e) => setGenerationForm({...generationForm, locationCode: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {locationCodes.filter(loc => loc.is_active).map(location => (
                      <option key={location.code} value={location.code}>
                        {location.code} - {location.location_name}
                      </option>
                    ))}
                  </select>
                </div>

                {generationForm.generationMode === 'manual' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Prefix</label>
                    <input
                      type="text"
                      value={generationForm.customPrefix}
                      onChange={(e) => setGenerationForm({...generationForm, customPrefix: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      placeholder="e.g., SPECIAL-"
                    />
                  </div>
                )}

                {generationForm.generationMode === 'range' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Index</label>
                      <input
                        type="number"
                        min="1"
                        value={generationForm.startIndex}
                        onChange={(e) => setGenerationForm({...generationForm, startIndex: parseInt(e.target.value) || 1})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Index</label>
                      <input
                        type="number"
                        min="1"
                        value={generationForm.endIndex}
                        onChange={(e) => setGenerationForm({...generationForm, endIndex: parseInt(e.target.value) || 100})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Hash size={16} />
                  Generate Cards
                </button>
                {generatedCards.length > 0 && (
                  <button
                    type="button"
                    onClick={downloadCardsCSV}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download CSV
                  </button>
                )}
              </div>
            </form>

            {/* Generated Cards Display */}
            {generatedCards.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-4">
                  Generated Cards ({generatedCards.length})
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">Control Number</th>
                        <th className="text-left py-2">Passcode</th>
                        <th className="text-left py-2">Location</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedCards.slice(0, 10).map((card) => (
                        <tr key={card.id} className="border-b border-gray-100">
                          <td className="py-2 font-mono text-blue-600">{card.control_number}</td>
                          <td className="py-2 font-mono text-orange-600">{card.passcode}</td>
                          <td className="py-2">{card.location_code}</td>
                          <td className="py-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              {card.status}
                            </span>
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => handleLoadCardHistory(card.id)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              View History
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {generatedCards.length > 10 && (
                    <p className="text-center text-gray-500 text-sm mt-2">
                      Showing first 10 cards. Download CSV for complete list.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Card Code Change History</h4>
            {cardHistory.length > 0 ? (
              <div className="space-y-3">
                {cardHistory.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {record.change_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p><strong>Field:</strong> {record.field_name}</p>
                      {record.old_value && (
                        <p><strong>Old Value:</strong> <span className="font-mono">{record.old_value}</span></p>
                      )}
                      <p><strong>New Value:</strong> <span className="font-mono">{record.new_value}</span></p>
                      {record.change_reason && (
                        <p><strong>Reason:</strong> {record.change_reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a card to view its change history</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Code Generation Analytics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Database className="text-blue-600" size={24} />
                  <div>
                    <p className="text-sm text-blue-600">Total Batches</p>
                    <p className="text-xl font-semibold text-blue-900">{batches.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Hash className="text-green-600" size={24} />
                  <div>
                    <p className="text-sm text-green-600">Generated Cards</p>
                    <p className="text-xl font-semibold text-green-900">{generatedCards.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="text-orange-600" size={24} />
                  <div>
                    <p className="text-sm text-orange-600">Location Codes</p>
                    <p className="text-xl font-semibold text-orange-900">{locationCodes.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Settings className="text-purple-600" size={24} />
                  <div>
                    <p className="text-sm text-purple-600">Active Settings</p>
                    <p className="text-xl font-semibold text-purple-900">
                      {codeSettings.filter(s => s.is_active).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Form Modal */}
      {showSettingsForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSettings ? 'Edit Code Generation Setting' : 'Create Code Generation Setting'}
              </h3>
              <button
                onClick={() => {
                  setShowSettingsForm(false);
                  resetSettingsForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingSettings ? handleUpdateSettings : handleCreateSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setting Type *</label>
                  <select
                    value={settingsForm.setting_type}
                    onChange={(e) => setSettingsForm({...settingsForm, setting_type: e.target.value as any})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="batch">Batch Numbers</option>
                    <option value="control">Control Numbers</option>
                    <option value="passcode">Passcodes</option>
                    <option value="location">Location Codes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Generation Mode *</label>
                  <select
                    value={settingsForm.generation_mode}
                    onChange={(e) => setSettingsForm({...settingsForm, generation_mode: e.target.value as any})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="auto">Automatic</option>
                    <option value="manual">Manual</option>
                    <option value="range">Range-based</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pattern Template</label>
                  <input
                    type="text"
                    value={settingsForm.pattern_template}
                    onChange={(e) => setSettingsForm({...settingsForm, pattern_template: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., B{year}{month}-{sequence}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Prefix</label>
                  <select
                    value={settingsForm.location_prefix}
                    onChange={(e) => setSettingsForm({...settingsForm, location_prefix: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {locationCodes.map(location => (
                      <option key={location.code} value={location.code}>
                        {location.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Sequence</label>
                  <input
                    type="number"
                    min="1"
                    value={settingsForm.current_sequence}
                    onChange={(e) => setSettingsForm({...settingsForm, current_sequence: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Range Start</label>
                  <input
                    type="number"
                    min="1"
                    value={settingsForm.auto_range_start}
                    onChange={(e) => setSettingsForm({...settingsForm, auto_range_start: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Range End</label>
                  <input
                    type="number"
                    min="1"
                    value={settingsForm.auto_range_end}
                    onChange={(e) => setSettingsForm({...settingsForm, auto_range_end: parseInt(e.target.value) || 999})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2 flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settingsForm.is_active}
                      onChange={(e) => setSettingsForm({...settingsForm, is_active: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {editingSettings ? 'Update Setting' : 'Create Setting'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsForm(false);
                    resetSettingsForm();
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

      {/* Location Form Modal */}
      {showLocationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLocation ? 'Edit Location Code' : 'Create Location Code'}
              </h3>
              <button
                onClick={() => {
                  setShowLocationForm(false);
                  resetLocationForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingLocation ? handleUpdateLocation : handleCreateLocation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={locationForm.code}
                  onChange={(e) => setLocationForm({...locationForm, code: e.target.value.toUpperCase()})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="PHL"
                  maxLength={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  value={locationForm.location_name}
                  onChange={(e) => setLocationForm({...locationForm, location_name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Philippines"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={locationForm.description}
                  onChange={(e) => setLocationForm({...locationForm, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={locationForm.sort_order}
                    onChange={(e) => setLocationForm({...locationForm, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={locationForm.is_active}
                      onChange={(e) => setLocationForm({...locationForm, is_active: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationForm(false);
                    resetLocationForm();
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