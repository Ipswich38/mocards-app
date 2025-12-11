import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CardGenerationSystemV2 } from './CardGenerationSystemV2';
import { CardActivationV2 } from './CardActivationV2';
import { DefaultPerksManagement } from './DefaultPerksManagement';
import { MOCCardManagement } from './MOCCardManagement';
import { ClinicManagementCRUD } from './ClinicManagementCRUD';
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
  Settings,
  UserCheck,
  LogOut
} from 'lucide-react';

interface MOCAdminDashboardV2Props {
  token: string | null;
  onBack: () => void;
}

export function MOCAdminDashboardV2({ token, onBack }: MOCAdminDashboardV2Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generate' | 'mocards' | 'clinics' | 'perks' | 'activate' | 'appointments' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
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
                  onClick={() => setActiveTab('settings')}
                  className="btn btn-outline p-4 text-left"
                >
                  <Settings className="h-6 w-6 mb-2" />
                  <div className="font-medium">Settings</div>
                  <div className="text-sm opacity-75">System configuration</div>
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

            {/* System Information */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">MOC System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Control Number Format</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Unactivated: <span className="font-mono">MOC-__-____-00001</span></li>
                    <li>• Activated: <span className="font-mono">MOC-01-1234-00001</span></li>
                    <li>• Location codes: 01-16 (Philippine regions)</li>
                    <li>• Clinic codes: 4-digit regional codes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">System Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• No passcode required</li>
                    <li>• Sequential numbering 1-10,000</li>
                    <li>• Default perks auto-assignment</li>
                    <li>• Migration version tracking</li>
                  </ul>
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
        return (
          <div className="card p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">Appointments Management</h3>
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Complete appointment management system coming soon...</p>
              <p className="text-gray-500 text-sm mt-2">Book, approve, reschedule, and manage all appointments</p>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="card p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">System Settings</h3>
            <div className="text-center py-12">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">System configuration and admin settings coming soon...</p>
              <p className="text-gray-500 text-sm mt-2">Admin profile management, logout, and system preferences</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg font-bold mr-3">
              M
            </div>
            <div className="text-xl font-bold text-gray-900">MOC Admin</div>
          </div>
        </div>

        <nav className="mt-6">
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
        </nav>

        <div className="absolute bottom-6 left-6 right-6 space-y-2">
          <button
            onClick={() => setActiveTab('settings')}
            className="w-full btn btn-outline flex items-center justify-center"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Admin Profile
          </button>
          <button
            onClick={onBack}
            className="w-full btn btn-outline flex items-center justify-center text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
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