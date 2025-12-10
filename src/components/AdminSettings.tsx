import { useState, useEffect } from 'react';
import {
  streamlinedOps,
  SystemConfig,
  TextLabel,
  CodeFormat,
  LocationCode,
} from '../lib/streamlined-operations';
import {
  Settings,
  Plus,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Type,
  Code,
  MapPin,
} from 'lucide-react';

interface AdminSettingsProps {
  token: string | null;
}

export function AdminSettings({ }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'labels' | 'formats' | 'locations'>('config');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [systemConfig, setSystemConfig] = useState<SystemConfig[]>([]);
  const [textLabels, setTextLabels] = useState<TextLabel[]>([]);
  const [codeFormats, setCodeFormats] = useState<CodeFormat[]>([]);
  const [locationCodes, setLocationCodes] = useState<LocationCode[]>([]);

  // Edit states
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  // Form states
  const [configForm, setConfigForm] = useState({
    config_key: '',
    config_value: '',
    config_type: 'string' as const,
    description: '',
    category: 'general',
  });

  const [labelForm, setLabelForm] = useState({
    label_key: '',
    label_value: '',
    label_category: 'general',
    description: '',
  });

  const [formatForm, setFormatForm] = useState({
    format_name: '',
    format_type: 'control_number' as const,
    format_template: '',
    description: '',
  });

  const [locationForm, setLocationForm] = useState({
    code: '',
    location_name: '',
    description: '',
  });

  // Load data
  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      const [configs, labels, formats, locations] = await Promise.all([
        streamlinedOps.getSystemConfig(),
        streamlinedOps.getTextLabels(),
        streamlinedOps.getCodeFormats(),
        streamlinedOps.getAllLocationCodes(),
      ]);

      setSystemConfig(configs);
      setTextLabels(labels);
      setCodeFormats(formats);
      setLocationCodes(locations);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings data');
    }
  };

  const handleUpdateConfig = async (configKey: string, newValue: string) => {
    try {
      await streamlinedOps.updateConfig(configKey, newValue);
      setSuccess('Configuration updated successfully');
      await loadSettingsData();
      setEditingConfig(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    }
  };

  const handleUpdateLabel = async (labelKey: string, newValue: string) => {
    try {
      await streamlinedOps.updateLabel(labelKey, newValue);
      setSuccess('Label updated successfully');
      await loadSettingsData();
      setEditingLabel(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update label');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location code? This action cannot be undone.')) {
      return;
    }

    try {
      await streamlinedOps.deleteLocationCode(locationId);
      setSuccess('Location code deleted successfully');
      await loadSettingsData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete location code');
    }
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await streamlinedOps.createConfig({
        ...configForm,
        is_active: true,
      });
      setSuccess('Configuration created successfully');
      setConfigForm({
        config_key: '',
        config_value: '',
        config_type: 'string',
        description: '',
        category: 'general',
      });
      await loadSettingsData();
    } catch (err: any) {
      setError(err.message || 'Failed to create configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await streamlinedOps.createLabel({
        ...labelForm,
        is_customizable: true,
      });
      setSuccess('Label created successfully');
      setLabelForm({
        label_key: '',
        label_value: '',
        label_category: 'general',
        description: '',
      });
      await loadSettingsData();
    } catch (err: any) {
      setError(err.message || 'Failed to create label');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFormat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await streamlinedOps.createCodeFormat({
        ...formatForm,
        is_active: true,
        is_default: false,
      });
      setSuccess('Code format created successfully');
      setFormatForm({
        format_name: '',
        format_type: 'control_number',
        format_template: '',
        description: '',
      });
      await loadSettingsData();
    } catch (err: any) {
      setError(err.message || 'Failed to create code format');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await streamlinedOps.createLocationCode({
        ...locationForm,
        is_active: true,
      });
      setSuccess('Location code created successfully');
      setLocationForm({
        code: '',
        location_name: '',
        description: '',
      });
      await loadSettingsData();
    } catch (err: any) {
      setError(err.message || 'Failed to create location code');
    } finally {
      setLoading(false);
    }
  };

  const settingsTabs = [
    { key: 'config', label: 'System Config', icon: Settings },
    { key: 'labels', label: 'Text Labels', icon: Type },
    { key: 'formats', label: 'Code Formats', icon: Code },
    { key: 'locations', label: 'Location Codes', icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Settings Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {settingsTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* System Config Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">System Configuration</h3>
                  <p className="text-sm text-gray-500">Manage system-wide settings and preferences</p>
                </div>
              </div>

              {/* Create New Config */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Configuration</h4>
                <form onSubmit={handleCreateConfig} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Config Key"
                    value={configForm.config_key}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, config_key: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Config Value"
                    value={configForm.config_value}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, config_value: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={configForm.config_type}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, config_type: e.target.value as any }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Category"
                    value={configForm.category}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, category: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </button>
                </form>
              </div>

              {/* Config List */}
              <div className="space-y-4">
                {Object.entries(
                  systemConfig.reduce((groups, config) => {
                    if (!groups[config.category]) groups[config.category] = [];
                    groups[config.category].push(config);
                    return groups;
                  }, {} as Record<string, SystemConfig[]>)
                ).map(([category, configs]) => (
                  <div key={category} className="border rounded-lg">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-medium text-gray-900 capitalize">{category}</h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {configs.map((config) => (
                        <div key={config.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-900">{config.config_key}</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                config.config_type === 'string' ? 'bg-blue-100 text-blue-800' :
                                config.config_type === 'number' ? 'bg-green-100 text-green-800' :
                                config.config_type === 'boolean' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {config.config_type}
                              </span>
                            </div>
                            {editingConfig === config.config_key ? (
                              <input
                                type="text"
                                defaultValue={config.config_value}
                                className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateConfig(config.config_key, e.currentTarget.value);
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm text-gray-500 mt-1">{config.config_value}</p>
                            )}
                            {config.description && (
                              <p className="text-xs text-gray-400 mt-1">{config.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {editingConfig === config.config_key ? (
                              <>
                                <button
                                  onClick={() => setEditingConfig(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setEditingConfig(config.config_key)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text Labels Tab */}
          {activeTab === 'labels' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Text Labels</h3>
                  <p className="text-sm text-gray-500">Customize user interface text and labels</p>
                </div>
              </div>

              {/* Create New Label */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Label</h4>
                <form onSubmit={handleCreateLabel} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Label Key"
                    value={labelForm.label_key}
                    onChange={(e) => setLabelForm(prev => ({ ...prev, label_key: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Label Value"
                    value={labelForm.label_value}
                    onChange={(e) => setLabelForm(prev => ({ ...prev, label_value: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={labelForm.label_category}
                    onChange={(e) => setLabelForm(prev => ({ ...prev, label_category: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </button>
                </form>
              </div>

              {/* Labels List */}
              <div className="space-y-4">
                {Object.entries(
                  textLabels.reduce((groups, label) => {
                    if (!groups[label.label_category]) groups[label.label_category] = [];
                    groups[label.label_category].push(label);
                    return groups;
                  }, {} as Record<string, TextLabel[]>)
                ).map(([category, labels]) => (
                  <div key={category} className="border rounded-lg">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-medium text-gray-900 capitalize">{category}</h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {labels.map((label) => (
                        <div key={label.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-900">{label.label_key}</span>
                              {!label.is_customizable && (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Read Only
                                </span>
                              )}
                            </div>
                            {editingLabel === label.label_key ? (
                              <input
                                type="text"
                                defaultValue={label.label_value}
                                className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateLabel(label.label_key, e.currentTarget.value);
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm text-gray-500 mt-1">{label.label_value}</p>
                            )}
                            {label.description && (
                              <p className="text-xs text-gray-400 mt-1">{label.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {label.is_customizable && (
                              <>
                                {editingLabel === label.label_key ? (
                                  <button
                                    onClick={() => setEditingLabel(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingLabel(label.label_key)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Formats Tab */}
          {activeTab === 'formats' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Code Formats</h3>
                  <p className="text-sm text-gray-500">Configure card number and code generation templates</p>
                </div>
              </div>

              {/* Create New Format */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Format</h4>
                <form onSubmit={handleCreateFormat} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Format Name"
                    value={formatForm.format_name}
                    onChange={(e) => setFormatForm(prev => ({ ...prev, format_name: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={formatForm.format_type}
                    onChange={(e) => setFormatForm(prev => ({ ...prev, format_type: e.target.value as any }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="control_number">Control Number</option>
                    <option value="passcode">Passcode</option>
                    <option value="batch_number">Batch Number</option>
                    <option value="clinic_code">Clinic Code</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Template (e.g., {prefix}-{sequence:4})"
                    value={formatForm.format_template}
                    onChange={(e) => setFormatForm(prev => ({ ...prev, format_template: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </button>
                </form>
              </div>

              {/* Formats List */}
              <div className="space-y-4">
                {Object.entries(
                  codeFormats.reduce((groups, format) => {
                    if (!groups[format.format_type]) groups[format.format_type] = [];
                    groups[format.format_type].push(format);
                    return groups;
                  }, {} as Record<string, CodeFormat[]>)
                ).map(([type, formats]) => (
                  <div key={type} className="border rounded-lg">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-medium text-gray-900 capitalize">{type.replace('_', ' ')}</h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {formats.map((format) => (
                        <div key={format.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-900">{format.format_name}</span>
                                {format.is_default && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1 font-mono">{format.format_template}</p>
                              {format.description && (
                                <p className="text-xs text-gray-400 mt-1">{format.description}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => streamlinedOps.deleteCodeFormat(format.id)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Codes Tab */}
          {activeTab === 'locations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Location Codes</h3>
                  <p className="text-sm text-gray-500">Manage location codes for passcode generation</p>
                </div>
              </div>

              {/* Create New Location */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Location</h4>
                <form onSubmit={handleCreateLocation} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="Code (e.g., 001)"
                    value={locationForm.code}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Location Name"
                    value={locationForm.location_name}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, location_name: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={locationForm.description}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </button>
                </form>
              </div>

              {/* Locations List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locationCodes.map((location) => (
                  <div key={location.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {location.code}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            location.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {location.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 mt-2">{location.location_name}</h4>
                        {location.description && (
                          <p className="text-sm text-gray-500 mt-1">{location.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Generates passcodes: {location.code}-XXXX
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteLocation(location.id)}
                        className="text-red-400 hover:text-red-600 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}