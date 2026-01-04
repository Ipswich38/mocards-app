import { useState, useEffect } from 'react';
import { ExternalLink, Globe, Key, CheckCircle, AlertCircle, Wifi, WifiOff, Settings, Copy } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { toastSuccess, toastError, toastWarning } from '../lib/toast';

interface ExternalApp {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

interface APIEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
}

export function ExternalAppConnector() {
  const [apps, setApps] = useState<ExternalApp[]>([]);
  const [newApp, setNewApp] = useState({
    name: '',
    url: '',
    apiKey: ''
  });
  const [isAddingApp, setIsAddingApp] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);

  const { addToast } = useToast();

  // Load saved apps from localStorage
  useEffect(() => {
    const savedApps = localStorage.getItem('mocards_external_apps');
    if (savedApps) {
      setApps(JSON.parse(savedApps));
    }
  }, []);

  // Save apps to localStorage
  const saveApps = (updatedApps: ExternalApp[]) => {
    setApps(updatedApps);
    localStorage.setItem('mocards_external_apps', JSON.stringify(updatedApps));
  };

  const addExternalApp = async () => {
    if (!newApp.name.trim() || !newApp.url.trim()) {
      addToast(toastWarning('Missing Information', 'Please provide app name and URL'));
      return;
    }

    const app: ExternalApp = {
      id: `app_${Date.now()}`,
      name: newApp.name.trim(),
      url: newApp.url.trim(),
      apiKey: newApp.apiKey.trim(),
      status: 'disconnected'
    };

    const updatedApps = [...apps, app];
    saveApps(updatedApps);

    setNewApp({ name: '', url: '', apiKey: '' });
    setIsAddingApp(false);

    addToast(toastSuccess('App Added', `${app.name} has been added successfully`));
  };

  const testConnection = async (appId: string) => {
    setIsTestingConnection(appId);

    try {
      const app = apps.find(a => a.id === appId);
      if (!app) return;

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Random success/failure for demo
      const isSuccess = Math.random() > 0.3;

      const updatedApps = apps.map(a =>
        a.id === appId
          ? {
              ...a,
              status: (isSuccess ? 'connected' : 'error') as ExternalApp['status'],
              lastSync: isSuccess ? new Date().toISOString() : undefined
            }
          : a
      );

      saveApps(updatedApps);

      if (isSuccess) {
        addToast(toastSuccess('Connection Successful', `Connected to ${app.name}`));
      } else {
        addToast(toastError('Connection Failed', `Could not connect to ${app.name}`));
      }

    } catch (error) {
      console.error('Connection test failed:', error);
      addToast(toastError('Test Failed', 'Failed to test connection'));
    } finally {
      setIsTestingConnection(null);
    }
  };

  const removeApp = (appId: string) => {
    const updatedApps = apps.filter(a => a.id !== appId);
    saveApps(updatedApps);
    addToast(toastSuccess('App Removed', 'External app has been removed'));
  };

  const getStatusIcon = (status: ExternalApp['status']) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />;
      case 'error':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      default:
        return <Globe className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ExternalApp['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const copyApiEndpoint = () => {
    const endpoint = `${window.location.origin}/api/v1/cards`;
    navigator.clipboard.writeText(endpoint);
    addToast(toastSuccess('Copied', 'API endpoint copied to clipboard'));
  };

  const availableEndpoints: APIEndpoint[] = [
    {
      name: 'Search Card',
      method: 'GET',
      endpoint: '/api/v1/cards/search?q={card_number}',
      description: 'Search for a card by control number'
    },
    {
      name: 'Get Card Details',
      method: 'GET',
      endpoint: '/api/v1/cards/{card_id}',
      description: 'Get detailed information about a specific card'
    },
    {
      name: 'Generate Cards',
      method: 'POST',
      endpoint: '/api/v1/cards/generate',
      description: 'Generate new cards (requires API key)'
    },
    {
      name: 'Bulk Export',
      method: 'GET',
      endpoint: '/api/v1/cards/export',
      description: 'Export card data in various formats'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ExternalLink className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">External App Connector</h1>
        <p className="text-gray-600 text-lg">Connect to external applications and share card data via API</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connected Apps */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Connected Apps</h2>
              <button
                onClick={() => setIsAddingApp(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-all"
              >
                Add App
              </button>
            </div>

            {apps.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No external apps connected</p>
                <p className="text-sm text-gray-400">Add an app to start sharing card data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(app.status)}
                        <div>
                          <h3 className="font-medium text-gray-900">{app.name}</h3>
                          <p className="text-sm text-gray-500">{app.url}</p>
                          {app.lastSync && (
                            <p className="text-xs text-gray-400">
                              Last sync: {new Date(app.lastSync).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                        <button
                          onClick={() => testConnection(app.id)}
                          disabled={isTestingConnection === app.id}
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                        >
                          {isTestingConnection === app.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-300 border-t-emerald-600"></div>
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => removeApp(app.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add App Form */}
          {isAddingApp && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add External App</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={newApp.name}
                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                    placeholder="e.g., Clinic Management System"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App URL
                  </label>
                  <input
                    type="url"
                    value={newApp.url}
                    onChange={(e) => setNewApp({ ...newApp, url: e.target.value })}
                    placeholder="https://your-app.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={newApp.apiKey}
                    onChange={(e) => setNewApp({ ...newApp, apiKey: e.target.value })}
                    placeholder="Enter API key for authentication"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={addExternalApp}
                    className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700"
                  >
                    Add App
                  </button>
                  <button
                    onClick={() => setIsAddingApp(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API Documentation */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Key className="h-6 w-6 mr-3 text-emerald-600" />
              API Endpoints
            </h2>

            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Base URL</h3>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <code className="flex-1 font-mono text-sm">{window.location.origin}/api/v1</code>
                <button
                  onClick={copyApiEndpoint}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {availableEndpoints.map((endpoint, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{endpoint.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {endpoint.method}
                    </span>
                  </div>
                  <code className="block text-sm bg-gray-50 p-2 rounded mb-2 font-mono">
                    {endpoint.endpoint}
                  </code>
                  <p className="text-sm text-gray-600">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-emerald-600" />
              Integration Guide
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong className="text-gray-900">1. Authentication:</strong>
                <p>Include your API key in the Authorization header: <code>Bearer YOUR_API_KEY</code></p>
              </div>
              <div>
                <strong className="text-gray-900">2. Rate Limits:</strong>
                <p>API is limited to 100 requests per minute per API key</p>
              </div>
              <div>
                <strong className="text-gray-900">3. Response Format:</strong>
                <p>All responses are in JSON format with standard HTTP status codes</p>
              </div>
              <div>
                <strong className="text-gray-900">4. Webhooks:</strong>
                <p>Configure webhook URLs to receive real-time updates when cards are created or modified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}