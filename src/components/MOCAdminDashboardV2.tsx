import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CardGenerationSystemV2 } from './CardGenerationSystemV2';
import { CardActivationV2 } from './CardActivationV2';
import { DefaultPerksManagement } from './DefaultPerksManagement';
import { MOCCardManagement } from './MOCCardManagement';
import { ClinicManagementCRUD } from './ClinicManagementCRUD';
import { AppointmentCalendar } from './AppointmentCalendar';
import { CardExportSystem } from './CardExportSystem';
import { DataIntegrityChecker } from './DataIntegrityChecker';
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
  Shield
} from 'lucide-react';

interface MOCAdminDashboardV2Props {
  token: string | null;
  onBack: () => void;
}

export function MOCAdminDashboardV2({ token, onBack }: MOCAdminDashboardV2Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generate' | 'mocards' | 'clinics' | 'perks' | 'activate' | 'appointments' | 'export' | 'integrity' | 'profile'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalCards: 0,
    unactivatedCards: 0,
    activatedCards: 0,
    totalClinics: 0,
    totalPerks: 0
  });

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
        v2CardsResult,
        totalClinicsResult,
        totalPerksResult
      ] = await Promise.all([
        supabase.from('cards').select('*', { count: 'exact', head: true }),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', false),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', true),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('migration_version', 2),
        supabase.from('mocards_clinics').select('*', { count: 'exact', head: true }),
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

      // Log stats for debugging
      console.log('📊 Dashboard stats updated:', {
        total: totalCardsResult.count,
        unactivated: unactivatedCardsResult.count,
        activated: activatedCardsResult.count,
        v2Cards: v2CardsResult.count,
        clinics: totalClinicsResult.count,
        perks: totalPerksResult.count
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'System overview and statistics'
    },
    {
      id: 'generate',
      label: 'Generate Cards',
      icon: CreditCard,
      description: 'Generate MOC cards'
    },
    {
      id: 'mocards',
      label: 'MOCARDS Management',
      icon: Users,
      description: 'View and manage 10,000 cards'
    },
    {
      id: 'clinics',
      label: 'Clinic Management',
      icon: Building2,
      description: 'Manage clinics and registration'
    },
    {
      id: 'perks',
      label: 'Perks Management',
      icon: Gift,
      description: 'Manage default perks'
    },
    {
      id: 'activate',
      label: 'Card Activation',
      icon: CheckCircle,
      description: 'Card activation system'
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Calendar,
      description: 'Manage appointments'
    },
    {
      id: 'export',
      label: 'Data Export',
      icon: Download,
      description: 'Export card data'
    },
    {
      id: 'integrity',
      label: 'Data Integrity',
      icon: Shield,
      description: 'Verify system health'
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">MOC Card System V2.0</h2>
                  <p className="text-gray-600">
                    Complete dental loyalty card management with new control number format
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last updated</p>
                  <p className="text-sm font-medium text-gray-700">
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs text-green-600">Live sync enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="card card-hover p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Cards</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card card-hover p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-yellow-100">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Unactivated</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.unactivatedCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card card-hover p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Activated</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activatedCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card card-hover p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <Building2 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Clinics</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalClinics.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card card-hover p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-indigo-100">
                    <Gift className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Perks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPerks.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('generate')}
                  className="btn btn-primary p-4 text-left"
                >
                  <CreditCard className="h-6 w-6 mb-2" />
                  <div className="font-medium">Generate Cards</div>
                  <div className="text-sm opacity-75">Create new MOC cards</div>
                </button>

                <button
                  onClick={() => setActiveTab('mocards')}
                  className="btn btn-secondary p-4 text-left"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <div className="font-medium">MOCARDS Management</div>
                  <div className="text-sm opacity-75">Manage all {stats.totalCards.toLocaleString()} cards</div>
                </button>

                <button
                  onClick={() => setActiveTab('activate')}
                  className="btn btn-outline p-4 text-left"
                >
                  <CheckCircle className="h-6 w-6 mb-2" />
                  <div className="font-medium">Activate Cards</div>
                  <div className="text-sm opacity-75">Assign location & clinic codes</div>
                </button>

                <button
                  onClick={() => setActiveTab('clinics')}
                  className="btn btn-outline p-4 text-left"
                >
                  <Building2 className="h-6 w-6 mb-2" />
                  <div className="font-medium">Clinic Management</div>
                  <div className="text-sm opacity-75">Register & manage clinics</div>
                </button>

                <button
                  onClick={() => setActiveTab('perks')}
                  className="btn btn-outline p-4 text-left"
                >
                  <Gift className="h-6 w-6 mb-2" />
                  <div className="font-medium">Manage Perks</div>
                  <div className="text-sm opacity-75">Default perks templates</div>
                </button>

                <button
                  onClick={() => setActiveTab('appointments')}
                  className="btn btn-outline p-4 text-left"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <div className="font-medium">Appointments</div>
                  <div className="text-sm opacity-75">Manage appointments</div>
                </button>

                <button
                  onClick={() => setActiveTab('export')}
                  className="btn btn-outline p-4 text-left"
                >
                  <Download className="h-6 w-6 mb-2" />
                  <div className="font-medium">Data Export</div>
                  <div className="text-sm opacity-75">Export all {stats.totalCards.toLocaleString()} cards</div>
                </button>

                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="btn btn-outline p-4 text-left disabled:opacity-50"
                >
                  <RefreshCw className={`h-6 w-6 mb-2 ${loading ? 'animate-spin' : ''}`} />
                  <div className="font-medium">Refresh Stats</div>
                  <div className="text-sm opacity-75">Update dashboard data</div>
                </button>
              </div>
            </div>

            {/* Additional Quick Stats */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">10,000 Cards Generated</span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">MOC system ready for activation</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-medium">Blockchain Inspired</span>
                  </div>
                  <p className="text-blue-600 text-sm mt-1">Control code verification system</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="text-purple-800 font-medium">Multi-Portal Access</span>
                  </div>
                  <p className="text-purple-600 text-sm mt-1">Admin, clinic, and patient views</p>
                </div>
              </div>
            </div>

            {/* Core MOC System Overview */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-3 text-blue-600" />
                MOC Card System V2.0 - Core Functions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card Generation & Management */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <h4 className="font-bold text-blue-900">Card Generation</h4>
                      <p className="text-blue-700 text-sm">10,000 MOC Cards</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-800">Format:</span>
                      <span className="font-mono text-blue-900">MOC-XX-XXXX-NNNNN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Sequential:</span>
                      <span className="text-blue-900">1 to 10,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Status:</span>
                      <span className="text-green-600 font-medium">✓ Generated</span>
                    </div>
                  </div>
                </div>

                {/* Activation System */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <h4 className="font-bold text-green-900">Activation System</h4>
                      <p className="text-green-700 text-sm">Clinic Assignment</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-800">Regions:</span>
                      <span className="text-green-900">01-16 (Philippines)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-800">Clinic Codes:</span>
                      <span className="text-green-900">4-digit regional</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-800">Method:</span>
                      <span className="text-green-900">No passcode</span>
                    </div>
                  </div>
                </div>

                {/* Perks & Benefits */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Gift className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <h4 className="font-bold text-purple-900">Default Perks</h4>
                      <p className="text-purple-700 text-sm">Auto-Assigned</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-800">Consultation:</span>
                      <span className="text-purple-900">₱500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-800">Cleaning:</span>
                      <span className="text-purple-900">₱800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-800">Total Value:</span>
                      <span className="text-purple-900 font-bold">₱5,000+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Workflow */}
              <div className="mt-6 bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Complete Workflow</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">1</span>
                      </div>
                      <span className="ml-2 text-sm font-medium">Generate 10K Cards</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">2</span>
                      </div>
                      <span className="ml-2 text-sm font-medium">Clinic Registration</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">3</span>
                      </div>
                      <span className="ml-2 text-sm font-medium">Card Activation</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">4</span>
                      </div>
                      <span className="ml-2 text-sm font-medium">Perks Redemption</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'generate':
        return <CardGenerationSystemV2 token={token} />;

      case 'mocards':
        return <MOCCardManagement />;

      case 'clinics':
        return <ClinicManagementCRUD />;

      case 'perks':
        return <DefaultPerksManagement token={token} />;

      case 'activate':
        return <CardActivationV2 clinicId="admin" clinicName="Admin Portal" />;

      case 'appointments':
        return <AppointmentCalendar token={token} />;

      case 'export':
        return <CardExportSystem />;

      case 'integrity':
        return <DataIntegrityChecker />;

      case 'profile':
        return (
          <div className="card p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">Admin Profile</h3>
            <div className="text-center py-12">
              <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Admin profile management and system settings coming soon...</p>
              <p className="text-gray-500 text-sm mt-2">Profile settings, preferences, and account management</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg font-bold mr-3">
            M
          </div>
          <div className="text-xl font-bold text-gray-900">MOC Admin</div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col
        lg:relative lg:translate-x-0 lg:shadow-sm
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 lg:block hidden">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg font-bold mr-3">
              M
            </div>
            <div className="text-xl font-bold text-gray-900">MOC Admin</div>
          </div>
        </div>

        {/* Mobile close button inside sidebar */}
        <div className="lg:hidden p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg font-bold mr-3">
              M
            </div>
            <div className="text-xl font-bold text-gray-900">MOC Admin</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 flex-1 flex flex-col">
          <div className="flex-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full text-left px-6 py-3 flex items-center transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom Admin Section */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-6 py-3 flex items-center transition-colors ${
                activeTab === 'profile'
                  ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <UserCheck className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Admin Profile</div>
                <div className="text-xs opacity-75">Account settings</div>
              </div>
            </button>
            <button
              onClick={onBack}
              className="w-full text-left px-6 py-3 flex items-center transition-colors text-red-600 hover:bg-red-50 hover:text-red-800"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Logout</div>
                <div className="text-xs opacity-75">Exit admin panel</div>
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}