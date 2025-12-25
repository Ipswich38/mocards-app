import { useState, useEffect } from 'react';
import { supabase, dbOperations } from '../lib/supabase';
import { CardGenerationSystemV2 } from './CardGenerationSystemV2';
import { CardActivationV2 } from './CardActivationV2';
import { DefaultPerksManagement } from './DefaultPerksManagement';
import { MOCCardManagement } from './MOCCardManagement';
import { ClinicManagementCRUD } from './ClinicManagementCRUD';
import { AppointmentCalendar } from './AppointmentCalendar';
import { CardExportSystem } from './CardExportSystem';
import { SearchComponent } from './SearchComponent';
import { PerkRedemption } from './PerkRedemption';
import {
  CreditCard,
  Users,
  CheckCircle,
  Clock,
  RefreshCw,
  Building2,
  Gift,
  BarChart3,
  Calendar,
  UserCheck,
  LogOut,
  Menu,
  X,
  Download,
  Settings
} from 'lucide-react';

interface MOCAdminDashboardV2Props {
  token: string | null;
  onBack: () => void;
}

export function MOCAdminDashboardV2({ token, onBack }: MOCAdminDashboardV2Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mocards' | 'clinics' | 'appointments' | 'export' | 'settings' | 'profile'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mocardsSubTab, setMocardsSubTab] = useState<'overview' | 'generate' | 'perks' | 'activation' | 'redemption'>('overview');
  const [stats, setStats] = useState({
    totalCards: 0,
    unactivatedCards: 0,
    activatedCards: 0,
    totalClinics: 0,
    totalPerks: 0
  });

  // Universal Card Lookup State
  const [searchSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundCard, setFoundCard] = useState<any>(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    loadStats();

    // Auto-refresh stats every 30 seconds when on dashboard
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') {
        loadStats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Refresh stats when switching back to dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get all stats in parallel for better performance
      const [
        totalCardsResult,
        unactivatedCardsResult,
        activatedCardsResult,
        _v2CardsResult,
        totalClinicsResult,
        totalPerksResult
      ] = await Promise.all([
        // Total sequential cards (1-10000)
        supabase.from('cards').select('*', { count: 'exact', head: true }).gte('card_number', 1).lte('card_number', 10000),
        // Unactivated sequential cards (available for assignment)
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', false).gte('card_number', 1).lte('card_number', 10000),
        // Activated sequential cards
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', true).gte('card_number', 1).lte('card_number', 10000),
        // Cards with proper V2 format
        supabase.from('cards').select('*', { count: 'exact', head: true }).like('control_number_v2', 'MOC-%').gte('card_number', 1).lte('card_number', 10000),
        supabase.from('clinics').select('*', { count: 'exact', head: true }),
        supabase.from('default_perk_templates').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        totalCards: totalCardsResult.count || 0,
        unactivatedCards: unactivatedCardsResult.count || 0,
        activatedCards: activatedCardsResult.count || 0,
        totalClinics: totalClinicsResult.count || 0,
        totalPerks: totalPerksResult.count || 0
      });

      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Universal Card Lookup Functions
  const handleUniversalSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setFoundCard(null);

    try {
      const card = await dbOperations.getCardByControlNumber(query.trim());
      if (card) {
        setFoundCard(card);

        // Load clinic info if assigned
        if (card.assigned_clinic_id) {
          const { data: clinic } = await supabase
            .from('clinics')
            .select('clinic_name, clinic_code')
            .eq('id', card.assigned_clinic_id)
            .single();

          if (clinic) {
            setFoundCard((prev: any) => ({ ...prev, clinic }));
          }
        }
      } else {
        setSearchError('Card not found. Try searching with 5-digit format (e.g., 00001) or full control number.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError('Search failed: ' + error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchResultSelect = (_result: any) => {
    // Production: logging removed
  };

  const handleSuggestionSelect = (suggestion: any) => {
    handleUniversalSearch(suggestion.text);
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'System overview'
    },
    {
      id: 'mocards',
      label: 'MOCARDS Management',
      icon: CreditCard,
      description: 'Cards, perks & activation'
    },
    {
      id: 'clinics',
      label: 'Clinic Management',
      icon: Building2,
      description: 'Manage clinics'
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Calendar,
      description: 'Booking system'
    },
    {
      id: 'export',
      label: 'Data Export',
      icon: Download,
      description: 'Export data'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'System settings'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Curved Header */}
            <div className="bg-[#1A535C] rounded-b-[40px] px-6 pt-8 pb-8 shadow-xl relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full transform -translate-x-8 translate-y-8"></div>

              <div className="flex items-center justify-between relative">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">MOC Card System V2.0</h2>
                  <p className="text-white/80 text-lg">
                    Complete dental loyalty card management with new control number format
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm uppercase tracking-wider">Last updated</p>
                  <p className="text-white text-lg font-medium">
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                  <div className="flex items-center mt-2">
                    <div className="w-3 h-3 rounded-full mr-2 bg-green-400"></div>
                    <span className="text-green-400 text-sm">Live sync enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                <div className="flex items-center">
                  <div className="p-3 rounded-2xl bg-blue-50">
                    <CreditCard className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Cards</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.totalCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                <div className="flex items-center">
                  <div className="p-3 rounded-2xl bg-orange-50">
                    <Clock className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unactivated</p>
                    <p className="text-2xl font-bold text-orange-500">{stats.unactivatedCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                <div className="flex items-center">
                  <div className="p-3 rounded-2xl bg-green-50">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Activated</p>
                    <p className="text-2xl font-bold text-green-500">{stats.activatedCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                <div className="flex items-center">
                  <div className="p-3 rounded-2xl bg-purple-50">
                    <Building2 className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Clinics</p>
                    <p className="text-2xl font-bold text-purple-500">{stats.totalClinics.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                <div className="flex items-center">
                  <div className="p-3 rounded-2xl bg-amber-50">
                    <Gift className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Perks</p>
                    <p className="text-2xl font-bold text-amber-500">{stats.totalPerks.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Universal Card Lookup */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold mb-6 text-gray-900">Universal Card Lookup</h3>
              <div className="space-y-4">
                <SearchComponent
                  placeholder="Search any card by 5-digit number (00001-10000) or full control number"
                  suggestions={searchSuggestions}
                  onSearch={handleUniversalSearch}
                  onResultSelect={handleSearchResultSelect}
                  onSuggestionSelect={handleSuggestionSelect}
                  isLoading={searchLoading}
                  results={[]}
                  className="w-full"
                  showRecentSearches={true}
                />

                {searchError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {searchError}
                  </div>
                )}

                {foundCard && (
                  <div className="border border-gray-200 rounded-2xl p-6 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                      <div>
                        <div className="font-mono text-lg break-all font-bold text-[#1A535C]">
                          {foundCard.control_number_v2 || foundCard.control_number}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Card #{foundCard.card_number} • Status: {foundCard.status}
                          {foundCard.is_activated && <span className="text-green-600 ml-2">• ✅ Activated</span>}
                          {!foundCard.is_activated && foundCard.assigned_clinic_id && <span className="text-blue-600 ml-2">• 📋 Assigned</span>}
                          {!foundCard.is_activated && !foundCard.assigned_clinic_id && <span className="text-orange-600 ml-2">• ⏳ Unassigned</span>}
                        </div>
                        {foundCard.clinic && (
                          <div className="text-sm text-gray-600 mt-1">
                            📍 {foundCard.clinic.clinic_name} ({foundCard.clinic.clinic_code})
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <div>Location: {foundCard.location_code || 'Not set'}</div>
                        <div>Created: {new Date(foundCard.created_at).toLocaleDateString()}</div>
                        {foundCard.activated_at && (
                          <div>Activated: {new Date(foundCard.activated_at).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold mb-6 text-gray-900">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setActiveTab('mocards');
                    setMocardsSubTab('generate');
                  }}
                  className="bg-white text-[#1A535C] rounded-xl shadow-md hover:shadow-lg font-bold p-4 text-left transition-all hover:scale-[1.02]"
                >
                  <CreditCard className="h-6 w-6 mb-2" />
                  <div className="font-medium">Generate Cards</div>
                  <div className="text-sm opacity-75">Create new MOC cards</div>
                </button>

                <button
                  onClick={() => setActiveTab('mocards')}
                  className="bg-white text-[#1A535C] rounded-xl shadow-md hover:shadow-lg font-bold p-4 text-left transition-all hover:scale-[1.02]"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <div className="font-medium">MOCARDS Management</div>
                  <div className="text-sm opacity-75">Manage all {stats.totalCards.toLocaleString()} cards</div>
                </button>

                <button
                  onClick={() => setActiveTab('clinics')}
                  className="bg-white text-[#1A535C] rounded-xl shadow-md hover:shadow-lg font-bold p-4 text-left transition-all hover:scale-[1.02]"
                >
                  <Building2 className="h-6 w-6 mb-2" />
                  <div className="font-medium">Clinic Management</div>
                  <div className="text-sm opacity-75">Register & manage clinics</div>
                </button>

                <button
                  onClick={() => setActiveTab('appointments')}
                  className="bg-white text-[#1A535C] rounded-xl shadow-md hover:shadow-lg font-bold p-4 text-left transition-all hover:scale-[1.02]"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <div className="font-medium">Appointments</div>
                  <div className="text-sm opacity-75">Booking system</div>
                </button>

                <button
                  onClick={() => setActiveTab('export')}
                  className="bg-white text-[#1A535C] rounded-xl shadow-md hover:shadow-lg font-bold p-4 text-left transition-all hover:scale-[1.02]"
                >
                  <Download className="h-6 w-6 mb-2" />
                  <div className="font-medium">Data Export</div>
                  <div className="text-sm opacity-75">Export data</div>
                </button>

                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="bg-white text-[#1A535C] rounded-xl shadow-md hover:shadow-lg font-bold p-4 text-left disabled:opacity-50 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw className={`h-6 w-6 mb-2 ${loading ? 'animate-spin' : ''}`} />
                  <div className="font-medium">Refresh Stats</div>
                  <div className="text-sm opacity-75">Update data</div>
                </button>
              </div>
            </div>

            {/* System Overview */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold mb-8 flex items-center text-gray-900">
                <BarChart3 className="h-6 w-6 mr-3 text-[#1A535C]" />
                MOC Card System V2.0 - Core Functions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card Generation & Management */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 border border-blue-200">
                  <div className="flex items-center mb-4">
                    <div className="p-3 rounded-2xl bg-blue-500">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-lg font-bold text-blue-900">Card Generation</h4>
                      <p className="text-blue-700 text-sm">10,000 MOC Cards</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-700 text-sm">Format:</span>
                      <span className="text-blue-900 text-sm font-mono">MOC-XX-XXXX-NNNNN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 text-sm">Sequential:</span>
                      <span className="text-blue-900 text-sm">1 to 10,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 text-sm">Status:</span>
                      <span className="text-green-600 text-sm font-medium">✓ Generated</span>
                    </div>
                  </div>
                </div>

                {/* Activation System */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-6 border border-green-200">
                  <div className="flex items-center mb-4">
                    <div className="p-3 rounded-2xl bg-green-500">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-lg font-bold text-green-900">Activation System</h4>
                      <p className="text-green-700 text-sm">Clinic Assignment</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-green-700 text-sm">Regions:</span>
                      <span className="text-green-900 text-sm">01-16 (Philippines)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 text-sm">Clinic Codes:</span>
                      <span className="text-green-900 text-sm">4-digit regional</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 text-sm">Method:</span>
                      <span className="text-green-900 text-sm">Direct assignment</span>
                    </div>
                  </div>
                </div>

                {/* Perks & Benefits */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-6 border border-purple-200">
                  <div className="flex items-center mb-4">
                    <div className="p-3 rounded-2xl bg-purple-500">
                      <Gift className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-lg font-bold text-purple-900">Default Perks</h4>
                      <p className="text-purple-700 text-sm">Auto-Assigned</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-purple-700 text-sm">Consultation:</span>
                      <span className="text-purple-900 text-sm">₱500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700 text-sm">Cleaning:</span>
                      <span className="text-purple-900 text-sm">₱800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700 text-sm">Total Value:</span>
                      <span className="text-purple-900 text-sm font-bold">₱5,000+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Workflow */}
              <div className="mt-8 bg-gray-50 rounded-2xl p-6">
                <h4 className="text-lg font-bold mb-6 text-gray-900">Complete Workflow</h4>
                <div className="flex items-center justify-between overflow-x-auto">
                  <div className="flex items-center space-x-6 min-w-max">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1A535C] text-white text-lg font-bold">
                        1
                      </div>
                      <span className="ml-3 text-gray-700 font-medium">Generate 10K Cards</span>
                    </div>
                    <span className="text-gray-400 text-lg">→</span>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500 text-white text-lg font-bold">
                        2
                      </div>
                      <span className="ml-3 text-gray-700 font-medium">Clinic Registration</span>
                    </div>
                    <span className="text-gray-400 text-lg">→</span>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 text-white text-lg font-bold">
                        3
                      </div>
                      <span className="ml-3 text-gray-700 font-medium">Card Activation</span>
                    </div>
                    <span className="text-gray-400 text-lg">→</span>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500 text-white text-lg font-bold">
                        4
                      </div>
                      <span className="ml-3 text-gray-700 font-medium">Perks Redemption</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mocards':
        return (
          <div className="space-y-6">
            {/* Curved Header */}
            <div className="bg-[#1A535C] rounded-b-[40px] px-6 pt-8 pb-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <h2 className="text-3xl font-bold text-white mb-3">MOCARDS Management</h2>
              <p className="text-white/80">Comprehensive card management system</p>
            </div>

            {/* Sub-navigation */}
            <div className="bg-white rounded-3xl p-3 border border-gray-100 shadow-sm">
              <div className="flex space-x-1">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'generate', label: 'Generate Cards' },
                  { id: 'perks', label: 'Perks Management' },
                  { id: 'activation', label: 'Card Activation' },
                  { id: 'redemption', label: 'Redeem Perks' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMocardsSubTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      mocardsSubTab === tab.id
                        ? 'bg-[#1A535C] text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tab content */}
            <div>
              {mocardsSubTab === 'overview' && <MOCCardManagement />}
              {mocardsSubTab === 'generate' && <CardGenerationSystemV2 token={token} />}
              {mocardsSubTab === 'perks' && <DefaultPerksManagement token={token} />}
              {mocardsSubTab === 'activation' && <CardActivationV2 clinicId="admin" clinicName="Admin Portal" />}
              {mocardsSubTab === 'redemption' && <PerkRedemption />}
            </div>
          </div>
        );

      case 'clinics':
        return (
          <div className="space-y-6">
            <div className="bg-[#1A535C] rounded-b-[40px] px-6 pt-8 pb-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <h2 className="text-3xl font-bold text-white mb-3">Clinic Management</h2>
              <p className="text-white/80">Register and manage clinic partners</p>
            </div>
            <ClinicManagementCRUD />
          </div>
        );

      case 'appointments':
        return (
          <div className="space-y-6">
            <div className="bg-[#1A535C] rounded-b-[40px] px-6 pt-8 pb-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <h2 className="text-3xl font-bold text-white mb-3">Appointments</h2>
              <p className="text-white/80">Manage booking system</p>
            </div>
            <AppointmentCalendar token={token} />
          </div>
        );

      case 'export':
        return (
          <div className="space-y-6">
            <div className="bg-[#1A535C] rounded-b-[40px] px-6 pt-8 pb-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <h2 className="text-3xl font-bold text-white mb-3">Data Export</h2>
              <p className="text-white/80">Export and backup system data</p>
            </div>
            <CardExportSystem />
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-[#1A535C] rounded-b-[40px] px-6 pt-8 pb-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <h2 className="text-3xl font-bold text-white mb-3">Settings</h2>
              <p className="text-white/80">System configuration</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="text-center py-16">
                <Settings className="h-20 w-20 mx-auto mb-6 text-gray-400" />
                <p className="text-lg mb-3 text-gray-600">System settings and configuration</p>
                <p className="text-gray-500">Settings panel coming soon...</p>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-[#1A535C] rounded-b-[40px] px-6 pt-8 pb-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <h2 className="text-3xl font-bold text-white mb-3">Profile</h2>
              <p className="text-white/80">Account management</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="text-center py-16">
                <UserCheck className="h-20 w-20 mx-auto mb-6 text-gray-400" />
                <p className="text-lg mb-3 text-gray-600">Profile & account management</p>
                <p className="text-gray-500">Profile settings coming soon...</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50/50 lg:ml-64">
      {/* Desktop Sidebar */}
      <div className={`
        w-64 flex flex-col bg-[#1A535C] fixed inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-bold bg-white text-[#1A535C]">
              M
            </div>
            <div className="ml-3 text-white text-lg font-bold">MOC Admin</div>
          </div>
        </div>

        {/* Mobile close button inside sidebar */}
        <div className="lg:hidden px-4 pb-4 flex justify-end">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 flex items-center rounded-2xl transition-all ${
                  activeTab === item.id
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-80">{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="mt-6 px-4 pb-6 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              setActiveTab('profile');
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 flex items-center rounded-2xl transition-all mb-2 ${
              activeTab === 'profile'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="h-5 w-5 mr-3" />
            <div>
              <div className="font-medium">Admin Profile</div>
              <div className="text-xs opacity-80">Account settings</div>
            </div>
          </button>
          <button
            onClick={onBack}
            className="w-full text-left px-4 py-3 flex items-center rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <div>
              <div className="font-medium">Logout</div>
              <div className="text-xs opacity-80">Exit admin panel</div>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Header & Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 right-4 z-40 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-xl bg-[#1A535C] text-white flex items-center justify-center font-bold mr-3">
              M
            </div>
            <div className="font-bold text-gray-900">MOC Admin</div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 pt-20 lg:pt-8 p-4 lg:p-8">
        {renderContent()}
      </div>
    </div>
  );
}