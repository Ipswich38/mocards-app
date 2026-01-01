import { useState, useEffect } from 'react';
import { EnterpriseAuth } from '../../lib/enterprise-auth';
import { CardGeneratorApp } from '../../features/card-generator/CardGeneratorApp';
import { ClinicManagementApp } from '../../features/clinic-management/ClinicManagementApp';
import { EnterpriseAnalytics } from '../analytics/EnterpriseAnalytics';
import { useAuth } from '../../hooks/useAuth';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useEnterpriseSync } from '../../hooks/useEnterpriseSync';
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
  CheckCircle,
  Building,
  Calendar,
  Edit3,
  Trash2,
  Save,
  X,
  Filter,
  BarChart3,
} from 'lucide-react';
import {
  cardOperations,
  clinicOperations,
  perkOperations,
  PLAN_LIMITS,
  type Card,
  type Clinic,
  type Perk,
  type PerkType
} from '../../lib/data';
import { cloudOperations } from '../../lib/supabaseCloudSync';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { DatabaseDebugger } from '../DatabaseDebugger';
import EnterpriseAnalyticsManager from '../admin/EnterpriseAnalyticsManager';
import { AppointmentCalendar } from '../AppointmentCalendar';

type AdminTab = 'analytics' | 'generator' | 'activation' | 'endorsement' | 'appointments' | 'clinic-management' | 'master-list' | 'debug' | 'settings';

export function AdminPortalView() {
  const { isAuthenticated, login, logout } = useAuth();
  useAutoRefresh({ enabled: true, showNotifications: true });
  const { registerSyncCallback, syncAfterCardGenerationBroadcast } = useEnterpriseSync();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');




  // Perks Management State
  const [perksManagement, setPerksManagement] = useState({
    showModal: false,
    editingPerk: null as Perk | null,
    form: {
      type: 'dental_cleaning' as PerkType,
      name: '',
      description: '',
      value: 800,
      isActive: true,
      validFor: 365,
      requiresApproval: false
    }
  });

  // Activation State
  const [activationQuery, setActivationQuery] = useState('');
  const [activationResult, setActivationResult] = useState<Card | null>(null);

  // Endorsement State
  const [endorsementForm, setEndorsementForm] = useState({
    clinicId: '',
    startRange: '',
    endRange: '',
  });



  // Admin Settings State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Simple admin credentials
  const [adminCredentials, setAdminCredentials] = useState({
    username: 'admin',
    password: 'admin123'
  });

  // CRUD State for Master List
  const [crudView, setCrudView] = useState<'cards' | 'clinics'>('cards');
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Data State for async operations
  const [cards, setCards] = useState<Card[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editCardForm, setEditCardForm] = useState({
    fullName: '',
    status: 'inactive' as 'active' | 'inactive',
    perksTotal: 5,
    perksUsed: 0,
    clinicId: '',
    expiryDate: '',
    notes: ''
  });

  const { addToast } = useToast();

  // Initialize perks on component mount
  useEffect(() => {
    const initPerks = async () => {
      await perkOperations.initializeDefaults();
    };
    initPerks();
  }, []);

  // Load data asynchronously
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cardsData, clinicsData, perksData] = await Promise.all([
          cardOperations.getAll(),
          clinicOperations.getAll(),
          perkOperations.getAll()
        ]);
        setCards(cardsData);
        setClinics(clinicsData);
        setPerks(perksData);
      } catch (error) {
        console.error('Failed to load data:', error);
        addToast(toastError('Error', 'Failed to load data'));
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();

      // Set up real-time subscriptions for live updates
      const cardsSubscription = supabase
        .channel('admin-cards-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'cards' },
          async (payload) => {
            console.log('[Admin] Real-time cards change detected:', payload);
            // Reload cards data when any card is updated
            try {
              const updatedCards = await cardOperations.getAll();
              setCards(updatedCards);
            } catch (error) {
              console.error('Failed to reload cards after real-time update:', error);
            }
          }
        )
        .subscribe();

      const clinicsSubscription = supabase
        .channel('admin-clinics-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'clinics' },
          async (payload) => {
            console.log('[Admin] Real-time clinics change detected:', payload);
            try {
              const updatedClinics = await clinicOperations.getAll();
              setClinics(updatedClinics);
            } catch (error) {
              console.error('Failed to reload clinics after real-time update:', error);
            }
          }
        )
        .subscribe();

      // Cleanup function
      return () => {
        cardsSubscription.unsubscribe();
        clinicsSubscription.unsubscribe();
      };
    }
  }, [isAuthenticated]);

  // Function to reload data after operations
  const reloadData = async () => {
    try {
      const [cardsData, clinicsData, perksData] = await Promise.all([
        cardOperations.getAll(),
        clinicOperations.getAll(),
        perkOperations.getAll()
      ]);
      setCards(cardsData);
      setClinics(clinicsData);
      setPerks(perksData);
    } catch (error) {
      console.error('Failed to reload data:', error);
      addToast(toastError('Error', 'Failed to reload data'));
    }
  };

  // Register enterprise sync callback
  useEffect(() => {
    if (isAuthenticated) {
      const unregister = registerSyncCallback('admin_portal_data', async () => {
        console.log('🔄 Enterprise sync triggered - reloading admin portal data');
        await reloadData();
      });

      return unregister;
    }
  }, [isAuthenticated, registerSyncCallback]);

  // Refresh data when switching to master-list tab to ensure sync
  useEffect(() => {
    if (activeTab === 'master-list' && isAuthenticated) {
      console.log('🔄 Refreshing data for master list sync');
      reloadData();
    }
    // Also refresh when accessing appointments tab
    if (activeTab === 'appointments' && isAuthenticated) {
      console.log('🔄 Refreshing appointment data sync');
      reloadData();
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enterprise authentication with security monitoring
    try {
      const result = await EnterpriseAuth.authenticateAdmin(loginForm.username, loginForm.password);

      if (result.success && result.user && result.token) {
        login('admin', result.user);
        // Store session token for validation
        localStorage.setItem('mocards_auth_token', result.token);
        addToast(toastSuccess('Welcome', 'Secure admin access granted'));
      } else {
        addToast(toastError('Login Failed', result.message || 'Invalid credentials'));
      }
    } catch (error) {
      console.error('Authentication error:', error);
      addToast(toastError('Login Failed', 'Authentication system error'));
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordChangeForm.currentPassword !== adminCredentials.password) {
      addToast(toastError('Invalid Password', 'Current password is incorrect'));
      return;
    }

    if (passwordChangeForm.newPassword.length < 8) {
      addToast(toastError('Password Too Short', 'New password must be at least 8 characters long'));
      return;
    }

    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      addToast(toastError('Passwords Do Not Match', 'Please confirm your new password correctly'));
      return;
    }

    setAdminCredentials({ ...adminCredentials, password: passwordChangeForm.newPassword });
    setPasswordChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordChange(false);
    addToast(toastSuccess('Password Changed', 'Admin password has been updated successfully'));
  };


  // Perks Management Functions
  const handlePerkSave = async () => {
    if (!perksManagement.form.name || !perksManagement.form.description) {
      addToast(toastWarning('Missing Fields', 'Please fill all required fields'));
      return;
    }

    if (perksManagement.editingPerk) {
      // Update existing perk
      await perkOperations.update(perksManagement.editingPerk.id, perksManagement.form);
      addToast(toastSuccess('Perk Updated', `Updated ${perksManagement.form.name}`));
    } else {
      // Create new perk
      await perkOperations.create(perksManagement.form);
      addToast(toastSuccess('Perk Created', `Created ${perksManagement.form.name}`));
    }

    // Reload data to refresh perks list
    await reloadData();

    // Reset form and close modal
    setPerksManagement({
      showModal: false,
      editingPerk: null,
      form: {
        type: 'dental_cleaning' as PerkType,
        name: '',
        description: '',
        value: 800,
        isActive: true,
        validFor: 365,
        requiresApproval: false
      }
    });
  };

  const handlePerkEdit = (perk: Perk) => {
    setPerksManagement({
      showModal: true,
      editingPerk: perk,
      form: {
        type: perk.type,
        name: perk.name,
        description: perk.description,
        value: perk.value,
        isActive: perk.isActive,
        validFor: perk.validFor,
        requiresApproval: perk.requiresApproval
      }
    });
  };

  const handlePerkDelete = async (perk: Perk) => {
    await perkOperations.delete(perk.id);
    addToast(toastSuccess('Perk Deleted', `Deleted ${perk.name}`));
    await reloadData(); // Refresh the data
  };

  const PERK_TYPE_OPTIONS: { value: PerkType; label: string }[] = [
    { value: 'dental_cleaning', label: 'Dental Cleaning' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'xray', label: 'X-Ray' },
    { value: 'treatment', label: 'Treatment' },
    { value: 'discount', label: 'Discount' },
    { value: 'extraction', label: 'Tooth Extraction (Bunot)' },
    { value: 'filling', label: 'Tooth Filling (Pasta)' },
    { value: 'fluoride', label: 'Fluoride Treatment' },
    { value: 'checkup', label: 'Checkup/Unlimited' }
  ];

  const handleActivationSearch = () => {
    if (!activationQuery.trim()) return;

    const card = cards.find(c => c.controlNumber === activationQuery);
    setActivationResult(card || null);

    if (!card) {
      addToast(toastWarning('Card Not Found', 'No card found with this number'));
    }
  };

  const handleToggleStatus = async () => {
    if (!activationResult) return;

    const newStatus = activationResult.status === 'active' ? 'inactive' : 'active';
    const success = await cardOperations.updateStatus(activationResult.controlNumber, newStatus);

    if (success) {
      setActivationResult({ ...activationResult, status: newStatus });
      addToast(toastSuccess('Status Updated', `Card is now ${newStatus}`));

      // CRITICAL FIX: Reload all data to sync dashboard and cloud
      await reloadData();
    } else {
      addToast(toastError('Update Failed', 'Failed to update card status'));
    }
  };

  const handleEndorsement = async () => {
    if (!endorsementForm.clinicId || !endorsementForm.startRange || !endorsementForm.endRange) {
      addToast(toastWarning('Missing Fields', 'Please fill all fields'));
      return;
    }

    const clinic = await clinicOperations.getById(endorsementForm.clinicId);
    if (!clinic) {
      addToast(toastError('Invalid Clinic', 'Clinic not found'));
      return;
    }

    // Get cards in range
    const allCards = cards;
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
    const currentAssigned = await clinicOperations.getAssignedCardsCount(clinic.id);
    const limit = PLAN_LIMITS[clinic.plan];

    if (currentAssigned + cardsToAssign.length > limit) {
      addToast(toastError(
        'Plan Limit Exceeded',
        `This would exceed the ${clinic.plan} plan limit of ${limit} cards. Current: ${currentAssigned}`
      ));
      return;
    }

    // Assign cards
    const success = await cardOperations.assignToClinic(
      cardsToAssign.map(c => c.controlNumber),
      clinic.id
    );

    if (success) {
      addToast(toastSuccess('Cards Assigned', `Assigned ${cardsToAssign.length} cards to ${clinic.name}`));
      setEndorsementForm({ clinicId: '', startRange: '', endRange: '' });
      // Reload data to reflect changes
      await reloadData();
    } else {
      addToast(toastError('Assignment Failed', 'Failed to assign cards to clinic'));
    }
  };


  // Additional Clinic CRUD Handlers


  // Admin Appointment Monitoring & Manual Creation
  // Note: Admin can only VIEW appointment statuses (read-only) and create manual appointments
  // All appointment processing (accept/decline/reschedule) is handled by clinics


  // CRUD Handlers for Cards
  const handleEditCard = (controlNumber: string) => {
    const card = cards.find(c => c.controlNumber === controlNumber);
    if (card) {
      setEditCardForm({
        fullName: card.fullName,
        status: card.status,
        perksTotal: card.perksTotal,
        perksUsed: card.perksUsed,
        clinicId: card.clinicId,
        expiryDate: card.expiryDate,
        notes: card.notes || ''
      });
      setEditingCard(controlNumber);
    }
  };

  const handleSaveCard = async (controlNumber: string) => {
    const updatedCard = cards.find(c => c.controlNumber === controlNumber);
    if (updatedCard) {
      try {
        // Use proper update operation through cardOperations
        // This will sync to the cloud properly
        const updateData = {
          fullName: editCardForm.fullName,
          status: editCardForm.status,
          perksTotal: editCardForm.perksTotal,
          perksUsed: editCardForm.perksUsed,
          clinicId: editCardForm.clinicId,
          expiryDate: editCardForm.expiryDate,
          notes: editCardForm.notes,
          updatedAt: new Date().toISOString()
        };

        // CRITICAL FIX: Actually save to database instead of just local update
        const success = await cloudOperations.cards.update(updatedCard.id, updateData);

        if (success) {
          setEditingCard(null);
          addToast(toastSuccess('Card Updated', `Updated ${controlNumber} successfully`));
          await reloadData(); // Refresh the data to show the saved changes
        } else {
          throw new Error('Failed to save to database');
        }
      } catch (error) {
        addToast(toastError('Update Failed', 'Failed to update card'));
      }
    }
  };

  const handleDeleteCard = async (controlNumber: string) => {
    if (window.confirm(`Are you sure you want to delete card ${controlNumber}? This action cannot be undone.`)) {
      try {
        const success = await cardOperations.delete(controlNumber);
        if (success) {
          addToast(toastSuccess('Card Deleted', `Card ${controlNumber} has been deleted`));
          await reloadData(); // Refresh the data
        } else {
          addToast(toastError('Delete Failed', 'Could not delete card'));
        }
      } catch (error) {
        addToast(toastError('Delete Failed', 'Could not delete card'));
      }
    }
  };


  const tabs = [
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, color: 'blue' },
    { id: 'generator' as const, label: 'Generator', icon: Plus, color: 'emerald' },
    { id: 'activation' as const, label: 'Activation', icon: Zap, color: 'cyan' },
    { id: 'appointments' as const, label: 'Appointments', icon: Calendar, color: 'rose' },
    { id: 'clinic-management' as const, label: 'Manage Clinics', icon: Building, color: 'indigo' },
    { id: 'endorsement' as const, label: 'Endorsement', icon: UserCheck, color: 'orange' },
    { id: 'master-list' as const, label: 'Master List', icon: Database, color: 'purple' },
    { id: 'debug' as const, label: 'Debug DB', icon: AlertTriangle, color: 'red' },
    { id: 'settings' as const, label: 'Settings', icon: Settings, color: 'gray' },
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
    { label: 'Total Cards', value: cards.length, icon: CreditCard, color: 'blue' },
    { label: 'Active Clinics', value: clinics.length, icon: Users, color: 'green' },
    { label: 'Active Cards', value: cards.filter(c => c.status === 'active').length, icon: CheckCircle, color: 'emerald' },
    { label: 'Pending Cards', value: cards.filter(c => c.status === 'inactive').length, icon: AlertTriangle, color: 'yellow' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <p className="text-gray-600">Loading admin data...</p>
          </div>
        </div>
      </div>
    );
  }

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
              onClick={logout}
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
          {/* Analytics Tab - Enterprise Analytics Dashboard */}
          {activeTab === 'analytics' && (
            <EnterpriseAnalytics />
          )}

          {/* Generator Tab - New Modular Card Generator */}
          {activeTab === 'generator' && (
            <CardGeneratorApp onSuccess={async () => {
              console.log('🎯 Card generation successful - forcing data reload');
              await reloadData();
              await syncAfterCardGenerationBroadcast();
              addToast(toastSuccess('Sync Complete', 'Master list updated with new cards'));
            }} />
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

          {/* Clinic Management Tab */}
          {activeTab === 'clinic-management' && (
            <ClinicManagementApp onSuccess={reloadData} />
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
                    {clinics.map((clinic) => (
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

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Appointment Management</h2>
                <div className="text-sm text-gray-600">
                  Manage appointments across all clinics
                </div>
              </div>
              <AppointmentCalendar token={adminCredentials.username} />
            </div>
          )}

          {/* Master List Tab - COMPREHENSIVE CRUD */}
          {activeTab === 'master-list' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Data Management</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setCrudView('cards')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      crudView === 'cards'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 inline mr-2" />
                    Cards
                  </button>
                  <button
                    onClick={() => setCrudView('clinics')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      crudView === 'clinics'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="h-4 w-4 inline mr-2" />
                    Clinics
                  </button>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={crudView === 'cards' ? 'Search cards by name or control number...' : 'Search clinics by name or code...'}
                    className="light-input pl-10"
                  />
                </div>
                {crudView === 'cards' && (
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                      className="light-select"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Cards CRUD Table */}
              {crudView === 'cards' && (
                <div className="light-table">
                  <table className="w-full">
                    <thead className="light-table-header">
                      <tr>
                        <th className="text-left p-4">Control Number</th>
                        <th className="text-left p-4">Patient Name</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Clinic</th>
                        <th className="text-left p-4">Perks</th>
                        <th className="text-left p-4">Expiry</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cards
                        .filter(card => {
                          const cardFullName = card.fullName || '';
                          const cardControlNumber = card.controlNumber || '';
                          const matchesSearch = !searchTerm ||
                            cardFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            cardControlNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (cardControlNumber.includes(searchTerm.toUpperCase()));
                          const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map((card) => {
                          const clinic = clinics.find(c => c.id === card.clinicId);
                          const isEditing = editingCard === card.controlNumber;
                          const cardFullName = card.fullName || 'Unnamed Card';
                          const cardControlNumber = card.controlNumber || '';

                          return (
                            <tr key={cardControlNumber} className="light-table-row">
                              <td className="p-4 font-mono text-sm">{cardControlNumber}</td>
                              <td className="p-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editCardForm.fullName}
                                    onChange={(e) => setEditCardForm({ ...editCardForm, fullName: e.target.value })}
                                    className="light-input text-sm"
                                  />
                                ) : (
                                  cardFullName
                                )}
                              </td>
                              <td className="p-4">
                                {isEditing ? (
                                  <select
                                    value={editCardForm.status}
                                    onChange={(e) => setEditCardForm({ ...editCardForm, status: e.target.value as 'active' | 'inactive' })}
                                    className="light-select text-sm"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                ) : (
                                  <span className={card.status === 'active' ? 'status-active' : 'status-inactive'}>
                                    {card.status}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                {isEditing ? (
                                  <select
                                    value={editCardForm.clinicId}
                                    onChange={(e) => setEditCardForm({ ...editCardForm, clinicId: e.target.value })}
                                    className="light-select text-sm"
                                  >
                                    <option value="">Unassigned</option>
                                    {clinics.map(clinic => (
                                      <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  clinic?.name || 'Unassigned'
                                )}
                              </td>
                              <td className="p-4">
                                {isEditing ? (
                                  <div className="flex space-x-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={editCardForm.perksUsed}
                                      onChange={(e) => setEditCardForm({ ...editCardForm, perksUsed: parseInt(e.target.value) || 0 })}
                                      className="light-input text-sm w-16"
                                    />
                                    <span className="text-gray-500 self-center">/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={editCardForm.perksTotal}
                                      onChange={(e) => setEditCardForm({ ...editCardForm, perksTotal: parseInt(e.target.value) || 1 })}
                                      className="light-input text-sm w-16"
                                    />
                                  </div>
                                ) : (
                                  `${card.perksUsed}/${card.perksTotal}`
                                )}
                              </td>
                              <td className="p-4">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={editCardForm.expiryDate}
                                    onChange={(e) => setEditCardForm({ ...editCardForm, expiryDate: e.target.value })}
                                    className="light-input text-sm"
                                  />
                                ) : (
                                  new Date(card.expiryDate).toLocaleDateString()
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveCard(card.controlNumber)}
                                        className="p-1 text-green-600 hover:text-green-700"
                                        title="Save changes"
                                      >
                                        <Save className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingCard(null)}
                                        className="p-1 text-gray-600 hover:text-gray-700"
                                        title="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditCard(card.controlNumber)}
                                        className="p-1 text-blue-600 hover:text-blue-700"
                                        title="Edit card"
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCard(card.controlNumber)}
                                        className="p-1 text-red-600 hover:text-red-700"
                                        title="Delete card"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Clinics CRUD Table */}
            </div>
          )}

          {/* Debug Tab */}
          {activeTab === 'debug' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">Database Debugger</h2>
              </div>
              <p className="text-gray-600">
                Use this tool to analyze the database and troubleshoot card lookup issues.
              </p>
              <DatabaseDebugger />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Admin Settings</h2>

              {/* Password Change Section */}
              <div className="light-card">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Password Management</h3>
                      <p className="text-sm text-gray-600">Change your admin password for security</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className="light-button-primary"
                    >
                      Change Password
                    </button>
                  </div>

                  {showPasswordChange && (
                    <div className="border-t border-gray-200 pt-4">
                      <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={passwordChangeForm.currentPassword}
                            onChange={(e) => setPasswordChangeForm({
                              ...passwordChangeForm,
                              currentPassword: e.target.value
                            })}
                            className="light-input"
                            placeholder="Enter current password"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={passwordChangeForm.newPassword}
                            onChange={(e) => setPasswordChangeForm({
                              ...passwordChangeForm,
                              newPassword: e.target.value
                            })}
                            className="light-input"
                            placeholder="Enter new password (min 8 characters)"
                            minLength={8}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordChangeForm.confirmPassword}
                            onChange={(e) => setPasswordChangeForm({
                              ...passwordChangeForm,
                              confirmPassword: e.target.value
                            })}
                            className="light-input"
                            placeholder="Confirm new password"
                            required
                          />
                        </div>

                        <div className="flex gap-2">
                          <button type="submit" className="light-button-primary">
                            Update Password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordChange(false);
                              setPasswordChangeForm({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: ''
                              });
                            }}
                            className="light-button-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              {/* System Information */}
              <div className="light-card">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Version:</span>
                      <span className="ml-2 text-gray-600">MOCARDS v3.0</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Environment:</span>
                      <span className="ml-2 text-gray-600">Production</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Last Login:</span>
                      <span className="ml-2 text-gray-600">{new Date().toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Admin Username:</span>
                      <span className="ml-2 text-gray-600">{adminCredentials.username}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise Analytics Manager */}
              <EnterpriseAnalyticsManager />
            </div>
          )}
        </div>
      </div>


      {/* Perks Management Modal */}
      {perksManagement.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {perksManagement.editingPerk ? 'Edit Perk' : 'Create New Perk'}
              </h3>
              <button
                onClick={() => setPerksManagement({ ...perksManagement, showModal: false })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handlePerkSave(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={perksManagement.form.type}
                  onChange={(e) => setPerksManagement({
                    ...perksManagement,
                    form: { ...perksManagement.form, type: e.target.value as PerkType }
                  })}
                  className="light-select"
                >
                  {PERK_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={perksManagement.form.name}
                  onChange={(e) => setPerksManagement({
                    ...perksManagement,
                    form: { ...perksManagement.form, name: e.target.value }
                  })}
                  className="light-input"
                  placeholder="e.g., Free Dental Cleaning"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={perksManagement.form.description}
                  onChange={(e) => setPerksManagement({
                    ...perksManagement,
                    form: { ...perksManagement.form, description: e.target.value }
                  })}
                  className="light-input"
                  placeholder="Describe this perk..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (₱ PHP)</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={perksManagement.form.value}
                    onChange={(e) => setPerksManagement({
                      ...perksManagement,
                      form: { ...perksManagement.form, value: parseInt(e.target.value) || 0 }
                    })}
                    className="light-input"
                    placeholder="800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Days</label>
                  <input
                    type="number"
                    min="1"
                    value={perksManagement.form.validFor}
                    onChange={(e) => setPerksManagement({
                      ...perksManagement,
                      form: { ...perksManagement.form, validFor: parseInt(e.target.value) || 365 }
                    })}
                    className="light-input"
                    placeholder="365"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={perksManagement.form.isActive}
                    onChange={(e) => setPerksManagement({
                      ...perksManagement,
                      form: { ...perksManagement.form, isActive: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={perksManagement.form.requiresApproval}
                    onChange={(e) => setPerksManagement({
                      ...perksManagement,
                      form: { ...perksManagement.form, requiresApproval: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Requires Approval</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="light-button-primary">
                  {perksManagement.editingPerk ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setPerksManagement({ ...perksManagement, showModal: false })}
                  className="light-button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Existing Perks List */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Existing Perks</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {perks.map(perk => (
                  <div key={perk.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{perk.name}</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${
                        perk.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {perk.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handlePerkEdit(perk)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePerkDelete(perk)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}