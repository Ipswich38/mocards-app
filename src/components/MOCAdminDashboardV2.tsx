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
import { CardAssignmentSystem } from './CardAssignmentSystem';
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
  Shield,
  ArrowRightLeft
} from 'lucide-react';

interface MOCAdminDashboardV2Props {
  token: string | null;
  onBack: () => void;
}

export function MOCAdminDashboardV2({ token, onBack }: MOCAdminDashboardV2Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generate' | 'mocards' | 'clinics' | 'assignments' | 'perks' | 'activate' | 'appointments' | 'export' | 'integrity' | 'profile'>('dashboard');
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
        // Total sequential cards (1-10000)
        supabase.from('cards').select('*', { count: 'exact', head: true }).gte('card_number', 1).lte('card_number', 10000),
        // Unactivated sequential cards (available for assignment)
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', false).gte('card_number', 1).lte('card_number', 10000),
        // Activated sequential cards
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', true).gte('card_number', 1).lte('card_number', 10000),
        // Cards with proper V2 format
        supabase.from('cards').select('*', { count: 'exact', head: true }).like('control_number_v2', 'MOC-%').gte('card_number', 1).lte('card_number', 10000),
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
      id: 'assignments',
      label: 'Card Assignment',
      icon: ArrowRightLeft,
      description: 'Assign cards to clinics'
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
            <div className="card-elevated p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="headline-large mb-3" style={{ color: 'var(--md-sys-color-on-surface)' }}>MOC Card System V2.0</h2>
                  <p className="body-large" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Complete dental loyalty card management with new control number format
                  </p>
                </div>
                <div className="text-right">
                  <p className="label-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Last updated</p>
                  <p className="body-medium font-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                  <div className="flex items-center mt-2">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: 'var(--md-sys-color-success)' }}></div>
                    <span className="label-small" style={{ color: 'var(--md-sys-color-success)' }}>Live sync enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Grid - Mobile Optimized */}
            <div className="grid-responsive">
              <div className="card-contrast-primary card-hover stats-card">
                <div className="flex items-center w-full">
                  <div className="p-3 rounded-lg" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--md-sys-shape-corner-large)',
                    flexShrink: 0
                  }}>
                    <CreditCard className="h-6 w-6" style={{ color: 'var(--md-sys-color-accent-yellow)' }} />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-accent-yellow)', opacity: 0.9 }}>Total Cards</p>
                    <p className="stats-number number-display">{stats.totalCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card-airbnb card-hover stats-card">
                <div className="flex items-center w-full">
                  <div className="p-3 rounded-lg" style={{
                    backgroundColor: 'var(--md-sys-color-warning-container)',
                    borderRadius: 'var(--md-sys-shape-corner-large)',
                    flexShrink: 0
                  }}>
                    <Clock className="h-6 w-6" style={{ color: 'var(--md-sys-color-accent-orange)' }} />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Unactivated</p>
                    <p className="stats-number number-display" style={{ color: 'var(--md-sys-color-accent-orange)' }}>{stats.unactivatedCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card-contrast-secondary card-hover stats-card">
                <div className="flex items-center w-full">
                  <div className="p-3 rounded-lg" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--md-sys-shape-corner-large)',
                    flexShrink: 0
                  }}>
                    <CheckCircle className="h-6 w-6" style={{ color: 'var(--md-sys-color-accent-orange)' }} />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-accent-orange)', opacity: 0.9 }}>Activated</p>
                    <p className="stats-number number-display">{stats.activatedCards.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card-airbnb card-hover stats-card">
                <div className="flex items-center w-full">
                  <div className="p-3 rounded-lg" style={{
                    backgroundColor: 'var(--md-sys-color-tertiary-container)',
                    borderRadius: 'var(--md-sys-shape-corner-large)',
                    flexShrink: 0
                  }}>
                    <Building2 className="h-6 w-6" style={{ color: 'var(--md-sys-color-accent-amber)' }} />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Clinics</p>
                    <p className="stats-number number-display" style={{ color: 'var(--md-sys-color-accent-amber)' }}>{stats.totalClinics.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card-airbnb card-hover stats-card">
                <div className="flex items-center w-full">
                  <div className="p-3 rounded-lg" style={{
                    backgroundColor: 'var(--md-sys-color-tertiary-container)',
                    borderRadius: 'var(--md-sys-shape-corner-large)',
                    flexShrink: 0
                  }}>
                    <Gift className="h-6 w-6" style={{ color: 'var(--md-sys-color-accent-amber)' }} />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Perks</p>
                    <p className="stats-number number-display" style={{ color: 'var(--md-sys-color-accent-amber)' }}>{stats.totalPerks.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-airbnb-elevated p-8">
              <h3 className="title-large mb-6" style={{ color: 'var(--md-sys-color-on-surface)' }}>Quick Actions</h3>
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
            <div className="card-airbnb-elevated p-8">
              <h3 className="title-large mb-6" style={{ color: 'var(--md-sys-color-on-surface)' }}>System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="status-success p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="title-medium">10,000 Cards Generated</span>
                  </div>
                  <p className="body-medium mt-2 opacity-90">MOC system ready for activation</p>
                </div>

                <div className="status-info p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    <span className="title-medium">Blockchain Inspired</span>
                  </div>
                  <p className="body-medium mt-2 opacity-90">Control code verification system</p>
                </div>

                <div className="card-contrast-secondary p-6">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    <span className="title-medium">Multi-Portal Access</span>
                  </div>
                  <p className="body-medium mt-2 opacity-90">Admin, clinic, and patient views</p>
                </div>
              </div>
            </div>

            {/* Core MOC System Overview */}
            <div className="card-airbnb-elevated p-8">
              <h3 className="title-large mb-8 flex items-center" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                <BarChart3 className="h-6 w-6 mr-3" style={{ color: 'var(--md-sys-color-primary)' }} />
                MOC Card System V2.0 - Core Functions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card Generation & Management */}
                <div className="card-contrast-primary p-6">
                  <div className="flex items-center mb-4">
                    <CreditCard className="h-8 w-8" style={{ color: 'var(--md-sys-color-on-primary-container)' }} />
                    <div className="ml-3">
                      <h4 className="title-medium" style={{ color: 'var(--md-sys-color-on-primary-container)' }}>Card Generation</h4>
                      <p className="body-small" style={{ color: 'var(--md-sys-color-on-primary-container)', opacity: 0.8 }}>10,000 MOC Cards</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-primary-container)', opacity: 0.9 }}>Format:</span>
                      <span className="body-small font-mono" style={{ color: 'var(--md-sys-color-on-primary-container)' }}>MOC-XX-XXXX-NNNNN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-primary-container)', opacity: 0.9 }}>Sequential:</span>
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-primary-container)' }}>1 to 10,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-primary-container)', opacity: 0.9 }}>Status:</span>
                      <span className="body-small font-medium" style={{ color: 'var(--md-sys-color-success)' }}>✓ Generated</span>
                    </div>
                  </div>
                </div>

                {/* Activation System */}
                <div className="status-success p-6">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="h-8 w-8" style={{ color: 'var(--md-sys-color-on-success-container)' }} />
                    <div className="ml-3">
                      <h4 className="title-medium" style={{ color: 'var(--md-sys-color-on-success-container)' }}>Activation System</h4>
                      <p className="body-small" style={{ color: 'var(--md-sys-color-on-success-container)', opacity: 0.8 }}>Clinic Assignment</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-success-container)', opacity: 0.9 }}>Regions:</span>
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-success-container)' }}>01-16 (Philippines)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-success-container)', opacity: 0.9 }}>Clinic Codes:</span>
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-success-container)' }}>4-digit regional</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-success-container)', opacity: 0.9 }}>Method:</span>
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-success-container)' }}>No passcode</span>
                    </div>
                  </div>
                </div>

                {/* Perks & Benefits */}
                <div className="card-contrast-secondary p-6">
                  <div className="flex items-center mb-4">
                    <Gift className="h-8 w-8" style={{ color: 'var(--md-sys-color-on-secondary-container)' }} />
                    <div className="ml-3">
                      <h4 className="title-medium" style={{ color: 'var(--md-sys-color-on-secondary-container)' }}>Default Perks</h4>
                      <p className="body-small" style={{ color: 'var(--md-sys-color-on-secondary-container)', opacity: 0.8 }}>Auto-Assigned</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-secondary-container)', opacity: 0.9 }}>Consultation:</span>
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-secondary-container)' }}>₱500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-secondary-container)', opacity: 0.9 }}>Cleaning:</span>
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-secondary-container)' }}>₱800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="body-small" style={{ color: 'var(--md-sys-color-on-secondary-container)', opacity: 0.9 }}>Total Value:</span>
                      <span className="body-small font-bold" style={{ color: 'var(--md-sys-color-on-secondary-container)' }}>₱5,000+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Workflow */}
              <div className="mt-8 card p-6">
                <h4 className="title-medium mb-6" style={{ color: 'var(--md-sys-color-on-surface)' }}>Complete Workflow</h4>
                <div className="flex items-center justify-between overflow-x-auto">
                  <div className="flex items-center space-x-6 min-w-max">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                        backgroundColor: 'var(--md-sys-color-primary-container)',
                        borderRadius: 'var(--md-sys-shape-corner-full)'
                      }}>
                        <span className="label-large font-bold" style={{ color: 'var(--md-sys-color-on-primary-container)' }}>1</span>
                      </div>
                      <span className="ml-3 body-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>Generate 10K Cards</span>
                    </div>
                    <span className="body-large" style={{ color: 'var(--md-sys-color-outline)' }}>→</span>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                        backgroundColor: 'var(--md-sys-color-success-container)',
                        borderRadius: 'var(--md-sys-shape-corner-full)'
                      }}>
                        <span className="label-large font-bold" style={{ color: 'var(--md-sys-color-on-success-container)' }}>2</span>
                      </div>
                      <span className="ml-3 body-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>Clinic Registration</span>
                    </div>
                    <span className="body-large" style={{ color: 'var(--md-sys-color-outline)' }}>→</span>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                        backgroundColor: 'var(--md-sys-color-secondary-container)',
                        borderRadius: 'var(--md-sys-shape-corner-full)'
                      }}>
                        <span className="label-large font-bold" style={{ color: 'var(--md-sys-color-on-secondary-container)' }}>3</span>
                      </div>
                      <span className="ml-3 body-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>Card Activation</span>
                    </div>
                    <span className="body-large" style={{ color: 'var(--md-sys-color-outline)' }}>→</span>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                        backgroundColor: 'var(--md-sys-color-warning-container)',
                        borderRadius: 'var(--md-sys-shape-corner-full)'
                      }}>
                        <span className="label-large font-bold" style={{ color: 'var(--md-sys-color-on-warning-container)' }}>4</span>
                      </div>
                      <span className="ml-3 body-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>Perks Redemption</span>
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

      case 'assignments':
        return <CardAssignmentSystem />;

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
          <div className="card-elevated p-8">
            <h3 className="headline-small mb-6" style={{ color: 'var(--md-sys-color-on-surface)' }}>Admin Profile</h3>
            <div className="text-center py-16">
              <UserCheck className="h-20 w-20 mx-auto mb-6" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
              <p className="body-large mb-3" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Admin profile management and system settings coming soon...</p>
              <p className="body-medium" style={{ color: 'var(--md-sys-color-outline)' }}>Profile settings, preferences, and account management</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--md-sys-color-surface)' }}>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between" style={{
        backgroundColor: 'var(--md-sys-color-surface-container)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        boxShadow: 'var(--md-sys-elevation-level2)'
      }}>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold mr-3" style={{
            backgroundColor: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            borderRadius: 'var(--md-sys-shape-corner-large)'
          }}>
            M
          </div>
          <div className="title-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>MOC Admin</div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn-text state-layer rounded-lg focus:outline-none"
          style={{
            padding: '8px',
            color: 'var(--md-sys-color-on-surface)',
            borderRadius: 'var(--md-sys-shape-corner-medium)'
          }}
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
        w-64 flex flex-col
        lg:relative lg:translate-x-0
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
        borderRight: '1px solid var(--md-sys-color-outline-variant)',
        boxShadow: 'var(--md-sys-elevation-level2)'
      }}>
        <div className="p-6 lg:block hidden">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold mr-3" style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
              borderRadius: 'var(--md-sys-shape-corner-large)'
            }}>
              M
            </div>
            <div className="title-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>MOC Admin</div>
          </div>
        </div>

        {/* Mobile close button inside sidebar */}
        <div className="lg:hidden p-4 flex items-center justify-between" style={{
          borderBottom: '1px solid var(--md-sys-color-outline-variant)'
        }}>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold mr-3" style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
              borderRadius: 'var(--md-sys-shape-corner-large)'
            }}>
              M
            </div>
            <div className="title-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>MOC Admin</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="btn-text state-layer"
            style={{
              padding: '8px',
              borderRadius: 'var(--md-sys-shape-corner-medium)',
              color: 'var(--md-sys-color-on-surface)'
            }}
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
                className="w-full text-left px-6 py-4 flex items-center transition-all duration-200 state-layer"
                style={{
                  backgroundColor: activeTab === item.id ? 'var(--md-sys-color-secondary-container)' : 'transparent',
                  color: activeTab === item.id ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)',
                  borderRight: activeTab === item.id ? '3px solid var(--md-sys-color-secondary)' : 'none',
                  borderRadius: activeTab === item.id ? '0 var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large) 0' : '0'
                }}
              >
                <item.icon className="h-6 w-6 mr-4" />
                <div>
                  <div className="label-large">{item.label}</div>
                  <div className="label-small opacity-80">{item.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom Admin Section */}
          <div className="mt-6 pt-4" style={{
            borderTop: '1px solid var(--md-sys-color-outline-variant)'
          }}>
            <button
              onClick={() => setActiveTab('profile')}
              className="w-full text-left px-6 py-4 flex items-center transition-all duration-200 state-layer"
              style={{
                backgroundColor: activeTab === 'profile' ? 'var(--md-sys-color-secondary-container)' : 'transparent',
                color: activeTab === 'profile' ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)',
                borderRight: activeTab === 'profile' ? '3px solid var(--md-sys-color-secondary)' : 'none',
                borderRadius: activeTab === 'profile' ? '0 var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large) 0' : '0'
              }}
            >
              <UserCheck className="h-6 w-6 mr-4" />
              <div>
                <div className="label-large">Admin Profile</div>
                <div className="label-small opacity-80">Account settings</div>
              </div>
            </button>
            <button
              onClick={onBack}
              className="w-full text-left px-6 py-4 flex items-center transition-all duration-200 state-layer"
              style={{
                color: 'var(--md-sys-color-error)',
                backgroundColor: 'transparent'
              }}
            >
              <LogOut className="h-6 w-6 mr-4" />
              <div>
                <div className="label-large">Logout</div>
                <div className="label-small opacity-80">Exit admin panel</div>
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--md-sys-color-surface)' }}>
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}