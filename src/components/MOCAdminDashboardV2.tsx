import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CardGenerationSystemV2 } from './CardGenerationSystemV2';
import { CardActivationV2 } from './CardActivationV2';
import { DefaultPerksManagement } from './DefaultPerksManagement';
import { MOCCardManagement } from './MOCCardManagement';
import {
  CreditCard,
  Users,
  CheckCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Building2,
  Gift,
  BarChart3
} from 'lucide-react';

interface MOCAdminDashboardV2Props {
  token: string | null;
  onBack: () => void;
}

export function MOCAdminDashboardV2({ token, onBack }: MOCAdminDashboardV2Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'cards' | 'activate' | 'perks' | 'analytics'>('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCards: 0,
    unactivatedCards: 0,
    activatedCards: 0,
    totalClinics: 0,
    totalPerks: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get total cards
      const { count: totalCards } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });

      // Get unactivated cards
      const { count: unactivatedCards } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_activated', false);

      // Get activated cards
      const { count: activatedCards } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_activated', true);

      // Get total clinics
      const { count: totalClinics } = await supabase
        .from('mocards_clinics')
        .select('*', { count: 'exact', head: true });

      // Get total perks templates
      const { count: totalPerks } = await supabase
        .from('default_perk_templates')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalCards: totalCards || 0,
        unactivatedCards: unactivatedCards || 0,
        activatedCards: activatedCards || 0,
        totalClinics: totalClinics || 0,
        totalPerks: totalPerks || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      description: 'System overview and statistics'
    },
    {
      id: 'generate',
      label: 'Generate Cards',
      icon: CreditCard,
      description: 'Generate 10,000 MOC cards'
    },
    {
      id: 'cards',
      label: 'Card Management',
      icon: Users,
      description: 'View and manage all cards'
    },
    {
      id: 'activate',
      label: 'Card Activation',
      icon: CheckCircle,
      description: 'Card activation system'
    },
    {
      id: 'perks',
      label: 'Perks Management',
      icon: Gift,
      description: 'Manage default perks'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'System analytics'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">MOC Card System V2.0</h2>
              <p className="text-gray-600">
                Complete dental loyalty card management with new control number format
              </p>
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
                  <div className="text-sm opacity-75">Create 10,000 new cards</div>
                </button>

                <button
                  onClick={() => setActiveTab('cards')}
                  className="btn btn-secondary p-4 text-left"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <div className="font-medium">View Cards</div>
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
                  onClick={() => setActiveTab('perks')}
                  className="btn btn-outline p-4 text-left"
                >
                  <Gift className="h-6 w-6 mb-2" />
                  <div className="font-medium">Manage Perks</div>
                  <div className="text-sm opacity-75">Default perks templates</div>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="btn btn-outline w-full py-3 disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Dashboard Statistics
                </button>
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

      case 'cards':
        return <MOCCardManagement />;

      case 'activate':
        return <CardActivationV2 clinicId="admin" clinicName="Admin Portal" />;

      case 'perks':
        return <DefaultPerksManagement token={token} />;

      case 'analytics':
        return (
          <div className="card p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">System Analytics</h3>
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Analytics dashboard coming soon...</p>
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

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={onBack}
            className="w-full btn btn-outline flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
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