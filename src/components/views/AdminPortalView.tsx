import { useState } from 'react';
import {
  Shield,
  Database,
  Users,
  Plus,
  Search,
  CreditCard,
  Settings,
  Zap,
  UserCheck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import {
  cardOperations,
  clinicOperations,
  PHILIPPINES_REGIONS,
  AREA_CODES,
  PLAN_LIMITS,
  generateControlNumber,
  type CardData
} from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

type AdminTab = 'generator' | 'activation' | 'endorsement' | 'master-list';

export function AdminPortalView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState<AdminTab>('generator');

  // Generator State
  const [generatorForm, setGeneratorForm] = useState({
    mode: 'single' as 'single' | 'batch',
    fullName: '',
    region: '',
    areaCode: '',
    startId: '',
    endId: '',
  });

  // Activation State
  const [activationQuery, setActivationQuery] = useState('');
  const [activationResult, setActivationResult] = useState<CardData | null>(null);

  // Endorsement State
  const [endorsementForm, setEndorsementForm] = useState({
    clinicId: '',
    startRange: '',
    endRange: '',
  });

  const { addToast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      setIsAuthenticated(true);
      addToast(toastSuccess('Welcome', 'Admin access granted'));
    } else {
      addToast(toastError('Login Failed', 'Invalid credentials'));
    }
  };

  const handleGenerateCards = () => {
    if (generatorForm.mode === 'single') {
      if (!generatorForm.fullName || !generatorForm.region || !generatorForm.areaCode) {
        addToast(toastWarning('Missing Fields', 'Please fill all required fields'));
        return;
      }

      const newId = cardOperations.getAll().length + 1;
      const controlNumber = generateControlNumber(newId, generatorForm.region, generatorForm.areaCode);

      const newCard: CardData = {
        controlNumber,
        fullName: generatorForm.fullName,
        status: 'inactive',
        perksTotal: 5,
        perksUsed: 0,
        clinicId: '',
        expiryDate: '2025-12-31',
      };

      cardOperations.create(newCard);
      addToast(toastSuccess('Card Generated', `Created ${controlNumber}`));
      setGeneratorForm({ ...generatorForm, fullName: '' });
    } else {
      // Batch generation
      const start = parseInt(generatorForm.startId);
      const end = parseInt(generatorForm.endId);

      if (!start || !end || start > end) {
        addToast(toastWarning('Invalid Range', 'Please enter a valid ID range'));
        return;
      }

      const cards = cardOperations.createBatch(start, end, generatorForm.region, generatorForm.areaCode);
      addToast(toastSuccess('Batch Generated', `Created ${cards.length} cards`));
    }
  };

  const handleActivationSearch = () => {
    if (!activationQuery.trim()) return;

    const card = cardOperations.getByControlNumber(activationQuery);
    setActivationResult(card);

    if (!card) {
      addToast(toastWarning('Card Not Found', 'No card found with this number'));
    }
  };

  const handleToggleStatus = () => {
    if (!activationResult) return;

    const newStatus = activationResult.status === 'active' ? 'inactive' : 'active';
    const success = cardOperations.updateStatus(activationResult.controlNumber, newStatus);

    if (success) {
      setActivationResult({ ...activationResult, status: newStatus });
      addToast(toastSuccess('Status Updated', `Card is now ${newStatus}`));
    }
  };

  const handleEndorsement = () => {
    if (!endorsementForm.clinicId || !endorsementForm.startRange || !endorsementForm.endRange) {
      addToast(toastWarning('Missing Fields', 'Please fill all fields'));
      return;
    }

    const clinic = clinicOperations.getById(endorsementForm.clinicId);
    if (!clinic) {
      addToast(toastError('Invalid Clinic', 'Clinic not found'));
      return;
    }

    // Get cards in range
    const allCards = cardOperations.getAll();
    const cardsToAssign = allCards.filter(card =>
      card.controlNumber >= endorsementForm.startRange &&
      card.controlNumber <= endorsementForm.endRange &&
      !card.clinicId // Only unassigned cards
    );

    if (cardsToAssign.length === 0) {
      addToast(toastWarning('No Cards', 'No unassigned cards found in this range'));
      return;
    }

    // Check plan limits
    const currentAssigned = clinicOperations.getAssignedCardsCount(clinic.id);
    const limit = PLAN_LIMITS[clinic.plan];

    if (currentAssigned + cardsToAssign.length > limit) {
      addToast(toastError(
        'Plan Limit Exceeded',
        `This would exceed the ${clinic.plan} plan limit of ${limit} cards. Current: ${currentAssigned}`
      ));
      return;
    }

    // Assign cards
    const success = cardOperations.assignToClinic(
      cardsToAssign.map(c => c.controlNumber),
      clinic.id
    );

    if (success) {
      addToast(toastSuccess('Cards Assigned', `Assigned ${cardsToAssign.length} cards to ${clinic.name}`));
      setEndorsementForm({ clinicId: '', startRange: '', endRange: '' });
    }
  };

  const tabs = [
    { id: 'generator' as const, label: 'Generator', icon: Plus, color: 'emerald' },
    { id: 'activation' as const, label: 'Activation', icon: Zap, color: 'blue' },
    { id: 'endorsement' as const, label: 'Endorsement', icon: UserCheck, color: 'orange' },
    { id: 'master-list' as const, label: 'Master List', icon: Database, color: 'purple' },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
            <p className="text-gray-600">Please authenticate to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="light-input"
                placeholder="Enter admin username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="light-input"
                placeholder="Enter admin password"
                required
              />
            </div>
            <button type="submit" className="light-button-primary w-full">
              Access Admin Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Cards', value: cardOperations.getAll().length, icon: CreditCard, color: 'blue' },
    { label: 'Active Clinics', value: clinicOperations.getAll().length, icon: Users, color: 'green' },
    { label: 'Active Cards', value: cardOperations.getAll().filter(c => c.status === 'active').length, icon: CheckCircle, color: 'emerald' },
    { label: 'Pending Cards', value: cardOperations.getAll().filter(c => c.status === 'inactive').length, icon: AlertTriangle, color: 'yellow' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Control Room</h1>
                <p className="text-gray-600">MOCARDS System Administration</p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="light-button-secondary flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="light-stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-2xl flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 ${
                    isActive ? 'light-tab-active' : 'light-tab'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="light-card">
        <div className="p-6">
          {/* Generator Tab */}
          {activeTab === 'generator' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Card Generator</h2>

              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setGeneratorForm({ ...generatorForm, mode: 'single' })}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    generatorForm.mode === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Single Card
                </button>
                <button
                  onClick={() => setGeneratorForm({ ...generatorForm, mode: 'batch' })}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    generatorForm.mode === 'batch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Batch Mode
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <select
                    value={generatorForm.region}
                    onChange={(e) => setGeneratorForm({ ...generatorForm, region: e.target.value })}
                    className="light-select"
                  >
                    <option value="">Select Region</option>
                    {PHILIPPINES_REGIONS.map((region) => (
                      <option key={region.code} value={region.code}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area Code</label>
                  <select
                    value={generatorForm.areaCode}
                    onChange={(e) => setGeneratorForm({ ...generatorForm, areaCode: e.target.value })}
                    className="light-select"
                  >
                    <option value="">Select Area Code</option>
                    {AREA_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                {generatorForm.mode === 'single' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={generatorForm.fullName}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, fullName: e.target.value })}
                      className="light-input"
                      placeholder="Enter patient full name"
                    />
                  </div>
                )}

                {generatorForm.mode === 'batch' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start ID</label>
                      <input
                        type="number"
                        value={generatorForm.startId}
                        onChange={(e) => setGeneratorForm({ ...generatorForm, startId: e.target.value })}
                        className="light-input"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End ID</label>
                      <input
                        type="number"
                        value={generatorForm.endId}
                        onChange={(e) => setGeneratorForm({ ...generatorForm, endId: e.target.value })}
                        className="light-input"
                        placeholder="100"
                      />
                    </div>
                  </>
                )}
              </div>

              <button onClick={handleGenerateCards} className="light-button-primary">
                {generatorForm.mode === 'single' ? 'Generate Card' : 'Generate Batch'}
              </button>
            </div>
          )}

          {/* Activation Tab */}
          {activeTab === 'activation' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Card Activation</h2>

              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={activationQuery}
                    onChange={(e) => setActivationQuery(e.target.value)}
                    className="light-input"
                    placeholder="Enter control number to activate"
                  />
                </div>
                <button onClick={handleActivationSearch} className="light-button-primary">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </button>
              </div>

              {activationResult && (
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{activationResult.fullName}</h3>
                      <p className="text-gray-600">{activationResult.controlNumber}</p>
                    </div>
                    <span className={activationResult.status === 'active' ? 'status-active' : 'status-inactive'}>
                      {activationResult.status}
                    </span>
                  </div>
                  <button onClick={handleToggleStatus} className="light-button-primary">
                    {activationResult.status === 'active' ? 'Deactivate' : 'Activate'} Card
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Endorsement Tab */}
          {activeTab === 'endorsement' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Card Endorsement</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                  <select
                    value={endorsementForm.clinicId}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, clinicId: e.target.value })}
                    className="light-select"
                  >
                    <option value="">Select Clinic</option>
                    {clinicOperations.getAll().map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name} ({clinic.plan})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Range</label>
                  <input
                    type="text"
                    value={endorsementForm.startRange}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, startRange: e.target.value })}
                    className="light-input"
                    placeholder="MOC-00001-NCR-CVT001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Range</label>
                  <input
                    type="text"
                    value={endorsementForm.endRange}
                    onChange={(e) => setEndorsementForm({ ...endorsementForm, endRange: e.target.value })}
                    className="light-input"
                    placeholder="MOC-00100-NCR-CVT001"
                  />
                </div>
              </div>

              <button onClick={handleEndorsement} className="light-button-primary">
                Assign Cards to Clinic
              </button>
            </div>
          )}

          {/* Master List Tab */}
          {activeTab === 'master-list' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Master Registry</h2>

              <div className="light-table">
                <table className="w-full">
                  <thead className="light-table-header">
                    <tr>
                      <th className="text-left p-4">Control Number</th>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Clinic</th>
                      <th className="text-left p-4">Perks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardOperations.getAll().map((card) => {
                      const clinic = clinicOperations.getById(card.clinicId);
                      return (
                        <tr key={card.controlNumber} className="light-table-row">
                          <td className="p-4 font-mono text-sm">{card.controlNumber}</td>
                          <td className="p-4">{card.fullName}</td>
                          <td className="p-4">
                            <span className={card.status === 'active' ? 'status-active' : 'status-inactive'}>
                              {card.status}
                            </span>
                          </td>
                          <td className="p-4">{clinic?.name || 'Unassigned'}</td>
                          <td className="p-4">{card.perksUsed}/{card.perksTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}