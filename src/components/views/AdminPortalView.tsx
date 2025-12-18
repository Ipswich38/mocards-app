import { useState, useEffect } from 'react';
import { Lock, Database, Zap, UserCheck, BarChart3, AlertTriangle, CheckCircle, Plus, TrendingUp, Brain } from 'lucide-react';
import {
  adminOperations,
  cardOperations,
  clinicOperations,
  type CardData,
  type Clinic,
  formatDate,
  getStatusColor,
  PLAN_LIMITS
} from '../../lib/data';
import { BusinessIntelligenceDashboard } from '../ui/BusinessIntelligenceDashboard';

export function AdminPortalView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'activation' | 'endorsement' | 'master' | 'analytics'>('generator');

  // Generator state
  const [generatorMode, setGeneratorMode] = useState<'single' | 'batch'>('single');
  const [singleCard, setSingleCard] = useState({
    fullName: '',
    region: '01',
    areaCode: '',
    perksTotal: 5
  });
  const [batchGen, setBatchGen] = useState({
    startId: 1,
    endId: 100,
    region: '01',
    areaCode: ''
  });

  // Activation state
  const [activationQuery, setActivationQuery] = useState('');
  const [activationResults, setActivationResults] = useState<CardData[]>([]);

  // Endorsement state
  const [selectedClinic, setSelectedClinic] = useState('');
  const [cardRange, setCardRange] = useState({ start: '', end: '' });
  const [endorsementError, setEndorsementError] = useState('');

  // Master list data
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setAllCards(cardOperations.getAll());
      setAllClinics(clinicOperations.getAll());
    }
  }, [isAuthenticated]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (adminOperations.authenticate(username, password)) {
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid admin credentials');
    }

    setLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setLoginError('');
  };

  // Generator functions
  const handleSingleGenerate = () => {
    if (!singleCard.fullName || !singleCard.areaCode) {
      showNotification('error', 'Please fill all required fields');
      return;
    }

    const newId = allCards.length + 1;
    const controlNumber = `MOC-${newId.toString().padStart(5, '0')}-${singleCard.region.padStart(2, '0')}-${singleCard.areaCode}`;

    const newCard: CardData = {
      controlNumber,
      fullName: singleCard.fullName,
      status: 'inactive',
      perksTotal: singleCard.perksTotal,
      perksUsed: 0,
      clinicId: '',
      expiryDate: '2025-12-31'
    };

    cardOperations.create(newCard);
    setAllCards(cardOperations.getAll());
    showNotification('success', `Card generated: ${controlNumber}`);

    // Reset form
    setSingleCard({ fullName: '', region: '01', areaCode: '', perksTotal: 5 });
  };

  const handleBatchGenerate = () => {
    if (!batchGen.areaCode || batchGen.startId >= batchGen.endId) {
      showNotification('error', 'Invalid batch parameters');
      return;
    }

    const newCards = cardOperations.generateBatch(
      batchGen.startId,
      batchGen.endId,
      batchGen.region,
      batchGen.areaCode
    );

    setAllCards(cardOperations.getAll());
    showNotification('success', `Generated ${newCards.length} cards successfully`);

    // Reset form
    setBatchGen({ startId: 1, endId: 100, region: '01', areaCode: '' });
  };

  // Activation functions
  const handleActivationSearch = () => {
    if (!activationQuery.trim()) {
      setActivationResults([]);
      return;
    }

    const results = allCards.filter(card =>
      card.controlNumber.toLowerCase().includes(activationQuery.toLowerCase()) ||
      card.fullName.toLowerCase().includes(activationQuery.toLowerCase())
    );

    setActivationResults(results);
  };

  const handleToggleActivation = (controlNumber: string) => {
    const card = allCards.find(c => c.controlNumber === controlNumber);
    if (!card) return;

    const newStatus = card.status === 'active' ? 'inactive' : 'active';
    cardOperations.updateStatus(controlNumber, newStatus);

    setAllCards(cardOperations.getAll());
    setActivationResults(prev => prev.map(c =>
      c.controlNumber === controlNumber ? { ...c, status: newStatus } : c
    ));

    showNotification('success', `Card ${controlNumber} is now ${newStatus}`);
  };

  // Endorsement functions
  const handleEndorsement = () => {
    setEndorsementError('');

    if (!selectedClinic || !cardRange.start || !cardRange.end) {
      setEndorsementError('Please fill all fields');
      return;
    }

    const startNum = parseInt(cardRange.start);
    const endNum = parseInt(cardRange.end);

    if (startNum > endNum) {
      setEndorsementError('Invalid range: start must be less than or equal to end');
      return;
    }

    // Find cards in range
    const cardsToAssign = allCards.filter(card => {
      const cardNum = parseInt(card.controlNumber.split('-')[1]);
      return cardNum >= startNum && cardNum <= endNum && !card.clinicId;
    });

    if (cardsToAssign.length === 0) {
      setEndorsementError('No unassigned cards found in this range');
      return;
    }

    const controlNumbers = cardsToAssign.map(card => card.controlNumber);
    const result = cardOperations.assignToClinic(controlNumbers, selectedClinic);

    if (result.success) {
      setAllCards(cardOperations.getAll());
      showNotification('success', `Successfully assigned ${cardsToAssign.length} cards to clinic`);
      setCardRange({ start: '', end: '' });
    } else {
      setEndorsementError(result.error || 'Assignment failed');
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      // LIGHT THEME LOGIN
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-[#1A535C] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Control Room</h1>
            <p className="text-gray-600">System administration portal</p>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-[#1A535C] hover:bg-[#0f3a42] text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </>
              ) : (
                'Access Control Room'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Admin credentials:</p>
            <p className="text-xs font-mono text-gray-800">admin / admin123</p>
          </div>
        </div>
      </div>
    );
  }

  // CLEAN LIGHT SaaS DASHBOARD
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Light Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Room</h1>
            <p className="text-gray-600 mt-1">MOCARDS System Administration</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-600">Logged in as</span>
              <span className="text-sm font-medium text-gray-900 ml-1">Administrator</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mx-8 mt-6 p-4 rounded-xl border ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-3" />
            ) : (
              <AlertTriangle className="h-5 w-5 mr-3" />
            )}
            {notification.message}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-gray-100 p-3 rounded-xl">
                <Database className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{allCards.length}</p>
                <p className="text-gray-600 text-sm">Total Cards</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-green-50 p-3 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {allCards.filter(c => c.status === 'active').length}
                </p>
                <p className="text-gray-600 text-sm">Active Cards</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-yellow-50 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{allClinics.length}</p>
                <p className="text-gray-600 text-sm">Total Clinics</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-purple-50 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {allCards.reduce((sum, card) => sum + card.perksUsed, 0)}
                </p>
                <p className="text-gray-600 text-sm">Perks Used</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="border-b border-gray-200 px-8">
            <nav className="flex space-x-8">
              {[
                { id: 'generator', label: 'Generator', icon: Database },
                { id: 'activation', label: 'Activation', icon: Zap },
                { id: 'endorsement', label: 'Endorsement', icon: UserCheck },
                { id: 'master', label: 'Master List', icon: BarChart3 },
                { id: 'analytics', label: 'Analytics', icon: Brain }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#1A535C] text-[#1A535C]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Generator Tab */}
            {activeTab === 'generator' && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Card Generator</h2>

                {/* Mode Selector */}
                <div className="bg-gray-100 p-1 rounded-xl flex mb-8 max-w-md">
                  <button
                    onClick={() => setGeneratorMode('single')}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium transition-colors ${
                      generatorMode === 'single'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Single Card
                  </button>
                  <button
                    onClick={() => setGeneratorMode('batch')}
                    className={`flex-1 px-6 py-2 rounded-lg font-medium transition-colors ${
                      generatorMode === 'batch'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Batch Generation
                  </button>
                </div>

                {/* Single Card Form */}
                {generatorMode === 'single' && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Generate Single Card</h3>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={singleCard.fullName}
                          onChange={(e) => setSingleCard(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                          placeholder="Enter patient name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                        <select
                          value={singleCard.region}
                          onChange={(e) => setSingleCard(prev => ({ ...prev, region: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                        >
                          {Array.from({ length: 16 }, (_, i) => (
                            <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                              Region {(i + 1).toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Area Code</label>
                        <input
                          type="text"
                          value={singleCard.areaCode}
                          onChange={(e) => setSingleCard(prev => ({ ...prev, areaCode: e.target.value.toUpperCase() }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                          placeholder="e.g., DEN001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Perks Total</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={singleCard.perksTotal}
                          onChange={(e) => setSingleCard(prev => ({ ...prev, perksTotal: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSingleGenerate}
                      className="bg-[#1A535C] hover:bg-[#0f3a42] text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Card
                    </button>
                  </div>
                )}

                {/* Batch Generation Form */}
                {generatorMode === 'batch' && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Batch Generation</h3>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start ID</label>
                        <input
                          type="number"
                          min="1"
                          value={batchGen.startId}
                          onChange={(e) => setBatchGen(prev => ({ ...prev, startId: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End ID</label>
                        <input
                          type="number"
                          min="1"
                          value={batchGen.endId}
                          onChange={(e) => setBatchGen(prev => ({ ...prev, endId: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                        <select
                          value={batchGen.region}
                          onChange={(e) => setBatchGen(prev => ({ ...prev, region: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                        >
                          {Array.from({ length: 16 }, (_, i) => (
                            <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                              Region {(i + 1).toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Area Code</label>
                        <input
                          type="text"
                          value={batchGen.areaCode}
                          onChange={(e) => setBatchGen(prev => ({ ...prev, areaCode: e.target.value.toUpperCase() }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                          placeholder="e.g., DEN001"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">
                        This will generate {Math.max(0, batchGen.endId - batchGen.startId + 1)} cards
                      </p>
                    </div>

                    <button
                      onClick={handleBatchGenerate}
                      className="bg-[#1A535C] hover:bg-[#0f3a42] text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Generate Batch
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Activation Tab */}
            {activeTab === 'activation' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Card Activation</h2>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex space-x-4 mb-6">
                    <input
                      type="text"
                      value={activationQuery}
                      onChange={(e) => setActivationQuery(e.target.value)}
                      placeholder="Search by control number or name..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                    />
                    <button
                      onClick={handleActivationSearch}
                      className="bg-[#1A535C] hover:bg-[#0f3a42] text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Search
                    </button>
                  </div>

                  {activationResults.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Control Number</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {activationResults.map((card) => (
                            <tr key={card.controlNumber} className="hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                                  {card.controlNumber}
                                </code>
                              </td>
                              <td className="py-3 px-4 text-gray-900">{card.fullName}</td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                                  {card.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleToggleActivation(card.controlNumber)}
                                  className={`px-4 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    card.status === 'active'
                                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                      : 'bg-green-100 hover:bg-green-200 text-green-700'
                                  }`}
                                >
                                  {card.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Endorsement Tab */}
            {activeTab === 'endorsement' && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Card Endorsement</h2>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Assign Cards to Clinic</h3>

                  {endorsementError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        {endorsementError}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Clinic</label>
                      <select
                        value={selectedClinic}
                        onChange={(e) => setSelectedClinic(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                      >
                        <option value="">Choose a clinic...</option>
                        {allClinics.map((clinic) => {
                          const currentCount = clinicOperations.getCardCount(clinic.id);
                          const limit = PLAN_LIMITS[clinic.plan];
                          return (
                            <option key={clinic.id} value={clinic.id}>
                              {clinic.name} ({clinic.code}) - {currentCount}/{limit} cards
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Card ID</label>
                        <input
                          type="number"
                          min="1"
                          value={cardRange.start}
                          onChange={(e) => setCardRange(prev => ({ ...prev, start: e.target.value }))}
                          placeholder="e.g., 1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Card ID</label>
                        <input
                          type="number"
                          min="1"
                          value={cardRange.end}
                          onChange={(e) => setCardRange(prev => ({ ...prev, end: e.target.value }))}
                          placeholder="e.g., 50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {selectedClinic && cardRange.start && cardRange.end && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            ⚠️ Plan Limit Enforcement
                          </p>
                          <p className="text-sm text-yellow-700">
                            The system will automatically block assignment if it exceeds clinic plan limits.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleEndorsement}
                    disabled={!selectedClinic || !cardRange.start || !cardRange.end}
                    className="bg-[#1A535C] hover:bg-[#0f3a42] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Assign Cards to Clinic
                  </button>
                </div>
              </div>
            )}

            {/* Master List Tab */}
            {activeTab === 'master' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Master Registry</h2>

                {/* Cards Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">All Cards</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Control Number</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Clinic</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Perks</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {allCards.slice(0, 20).map((card) => {
                          const clinic = allClinics.find(c => c.id === card.clinicId);
                          return (
                            <tr key={card.controlNumber} className="hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                                  {card.controlNumber}
                                </code>
                              </td>
                              <td className="py-3 px-4 text-gray-900">{card.fullName}</td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                                  {card.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-900">
                                {clinic ? clinic.name : <span className="text-gray-500">Unassigned</span>}
                              </td>
                              <td className="py-3 px-4 text-gray-900">
                                {card.perksUsed} / {card.perksTotal}
                              </td>
                              <td className="py-3 px-4 text-gray-900">
                                {formatDate(card.expiryDate)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {allCards.length > 20 && (
                    <div className="px-6 py-4 border-t border-gray-200 text-center text-gray-500">
                      Showing first 20 cards of {allCards.length} total
                    </div>
                  )}
                </div>

                {/* Clinics Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">All Clinics</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Code</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Plan</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Cards Used</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {allClinics.map((clinic) => {
                          const cardCount = clinicOperations.getCardCount(clinic.id);
                          const limit = PLAN_LIMITS[clinic.plan];
                          const utilization = (cardCount / limit) * 100;

                          return (
                            <tr key={clinic.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900 font-medium">{clinic.name}</td>
                              <td className="py-3 px-4">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                                  {clinic.code}
                                </code>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                                  {clinic.plan}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-900">{cardCount} / {limit}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <div className="bg-gray-200 rounded-full h-2 w-20 mr-3">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.min(utilization, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-600 font-medium">{utilization.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="-m-8">
                <BusinessIntelligenceDashboard />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}