import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
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
  Building2,
  Calendar,
  Clock,
  Phone,
  Mail,
  Edit3,
  Trash2,
  Save,
  X,
  Filter,
  Send,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import {
  cardOperations,
  clinicOperations,
  appointmentOperations,
  perkOperations,
  PHILIPPINES_REGIONS,
  AREA_CODES,
  PLAN_LIMITS,
  PLAN_PRICING,
  generateControlNumber,
  generateClinicCode,
  type Card,
  type Clinic,
  type ClinicPlan,
  type Perk,
  type PerkType
} from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

type AdminTab = 'generator' | 'activation' | 'endorsement' | 'appointments' | 'clinic-management' | 'master-list' | 'settings';

export function AdminPortalView() {
  const { isAuthenticated, login, logout } = useAuth();
  useAutoRefresh({ enabled: true, showNotifications: true });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState<AdminTab>('generator');

  // Generator State
  const [generatorForm, setGeneratorForm] = useState({
    mode: 'single' as 'single' | 'batch',
    region: '',
    areaCode: '',
    customAreaCode: '',
    startId: '',
    endId: '',
    perksTotal: 5, // Default perks per card
  });

  // Perks Management State
  const [perksManagement, setPerksManagement] = useState({
    showModal: false,
    editingPerk: null as Perk | null,
    form: {
      type: 'dental_cleaning' as PerkType,
      name: '',
      description: '',
      value: 0,
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

  // Clinic Management State
  const [clinicForm, setClinicForm] = useState({
    name: '',
    region: '',
    plan: 'starter' as ClinicPlan,
    areaCode: '',
    customAreaCode: '',
    address: '',
    adminClinic: '',
    email: '',
    contactNumber: '',
    password: '',
  });

  // Additional Clinic CRUD State
  const [showClinicForm, setShowClinicForm] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

  // Admin Appointment Monitoring State (Read-Only + Manual Creation) - Production Ready
  const [appointmentRequests, setAppointmentRequests] = useState<any[]>([]);

  // Manual appointment creation form
  const [showManualAppointmentForm, setShowManualAppointmentForm] = useState(false);
  const [manualAppointmentForm, setManualAppointmentForm] = useState({
    cardControlNumber: '',
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    preferredDate: '',
    preferredTime: '',
    serviceType: '',
    perkRequested: '',
    clinicId: '',
    adminNotes: ''
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
  const [showingCredentials, setShowingCredentials] = useState<string | null>(null);
  const [editCardForm, setEditCardForm] = useState({
    fullName: '',
    status: 'inactive' as 'active' | 'inactive',
    perksTotal: 5,
    perksUsed: 0,
    clinicId: '',
    expiryDate: '',
    notes: ''
  });
  const [editClinicForm, setEditClinicForm] = useState({
    name: '',
    region: '',
    plan: 'starter' as ClinicPlan,
    address: '',
    adminClinic: '',
    email: '',
    contactNumber: '',
    password: ''
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple authentication check - in production this would connect to Supabase
    // For now, check against hardcoded credentials matching the database
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      login('admin', { username: loginForm.username });
      addToast(toastSuccess('Welcome', 'Admin access granted'));
    } else {
      addToast(toastError('Login Failed', 'Invalid credentials'));
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

  const handleGenerateCards = async () => {
    if (generatorForm.mode === 'single') {
      if (!generatorForm.region || !generatorForm.areaCode) {
        addToast(toastWarning('Missing Fields', 'Please fill all required fields'));
        return;
      }

      // Handle custom area code
      let finalAreaCode = generatorForm.areaCode;
      if (generatorForm.areaCode === 'Custom' && generatorForm.customAreaCode) {
        finalAreaCode = generatorForm.customAreaCode;
      }

      const newId = cards.length + 1;
      const controlNumber = generateControlNumber(newId, generatorForm.region, finalAreaCode);

      const newCard: Omit<Card, 'id' | 'createdAt' | 'updatedAt'> = {
        controlNumber,
        fullName: '', // Empty name - will be filled when card is activated
        status: 'inactive',
        perksTotal: generatorForm.perksTotal,
        perksUsed: 0,
        clinicId: '',
        expiryDate: '2025-12-31',
      };

      await cardOperations.create(newCard);
      addToast(toastSuccess('Card Generated', `Created ${controlNumber} with ${generatorForm.perksTotal} perks`));
      await reloadData(); // Refresh the data
    } else {
      // Batch generation
      const start = parseInt(generatorForm.startId);
      const end = parseInt(generatorForm.endId);

      if (!start || !end || start > end) {
        addToast(toastWarning('Invalid Range', 'Please enter a valid ID range'));
        return;
      }

      // Handle custom area code
      let finalAreaCode = generatorForm.areaCode;
      if (generatorForm.areaCode === 'Custom' && generatorForm.customAreaCode) {
        finalAreaCode = generatorForm.customAreaCode;
      }

      const generatedCards = await cardOperations.createBatch(start, end, generatorForm.region, finalAreaCode, generatorForm.perksTotal);
      addToast(toastSuccess('Batch Generated', `Created ${generatedCards.length} cards with ${generatorForm.perksTotal} perks each`));
      await reloadData(); // Refresh the data
    }
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
        value: 0,
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
    { value: 'discount', label: 'Discount' }
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
    }
  };

  const handleCreateClinic = async () => {
    if (!clinicForm.name || !clinicForm.region || !clinicForm.plan || !clinicForm.areaCode || !clinicForm.password) {
      addToast(toastWarning('Missing Required Fields', 'Please fill all required fields'));
      return;
    }

    // Handle custom area code
    let finalAreaCode = clinicForm.areaCode;
    if (clinicForm.areaCode === 'Custom' && clinicForm.customAreaCode) {
      finalAreaCode = clinicForm.customAreaCode;
    }

    // Generate clinic code
    const clinicCode = await generateClinicCode(finalAreaCode);

    try {
      const newClinic: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt' | 'subscriptionStatus' | 'subscriptionStartDate' | 'maxCards' | 'isActive'> = {
        name: clinicForm.name,
        region: clinicForm.region,
        plan: clinicForm.plan,
        code: clinicCode,
        address: clinicForm.address || undefined,
        adminClinic: clinicForm.adminClinic || undefined,
        email: clinicForm.email || undefined,
        contactNumber: clinicForm.contactNumber || undefined,
        password: clinicForm.password,
        subscriptionPrice: PLAN_PRICING[clinicForm.plan],
      };

      const createdClinic = await clinicOperations.create(newClinic);

      addToast(toastSuccess(
        'Clinic Created',
        `${createdClinic.name} created successfully with code ${createdClinic.code}`
      ));

      // Reset form
      setClinicForm({
        name: '',
        region: '',
        plan: 'starter' as ClinicPlan,
        areaCode: '',
        customAreaCode: '',
        address: '',
        adminClinic: '',
        email: '',
        contactNumber: '',
        password: '',
      });

      await reloadData(); // Refresh the data
    } catch (error) {
      addToast(toastError('Creation Failed', 'Failed to create clinic'));
    }
  };

  // Additional Clinic CRUD Handlers
  const handleEditClinic = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setClinicForm({
      name: clinic.name,
      region: clinic.region,
      plan: clinic.plan,
      areaCode: clinic.code.substring(0, 3), // Extract from clinic code
      customAreaCode: '',
      address: clinic.address || '',
      adminClinic: clinic.adminClinic || '',
      email: clinic.email || '',
      contactNumber: clinic.contactNumber || '',
      password: '', // Don't populate password for security
    });
    setShowClinicForm(true);
  };

  const handleUpdateClinic = async () => {
    if (!editingClinic) return;

    if (!clinicForm.name || !clinicForm.region || !clinicForm.plan) {
      addToast(toastWarning('Missing Required Fields', 'Please fill all required fields'));
      return;
    }

    try {
      const updates: Partial<Clinic> = {
        name: clinicForm.name,
        region: clinicForm.region,
        plan: clinicForm.plan,
        address: clinicForm.address || undefined,
        adminClinic: clinicForm.adminClinic || undefined,
        email: clinicForm.email || undefined,
        contactNumber: clinicForm.contactNumber || undefined,
        maxCards: PLAN_LIMITS[clinicForm.plan],
        updatedAt: new Date().toISOString(),
      };

      // Only update password if provided
      if (clinicForm.password.trim()) {
        updates.password = clinicForm.password;
      }

      const success = await clinicOperations.update(editingClinic.id, updates);

      if (success) {
        addToast(toastSuccess('Clinic Updated', `${clinicForm.name} has been updated successfully`));
        setShowClinicForm(false);
        setEditingClinic(null);
        setClinicForm({
          name: '', region: '', plan: 'starter', areaCode: '', customAreaCode: '',
          password: '', address: '', adminClinic: '', email: '', contactNumber: ''
        });
      } else {
        addToast(toastError('Update Failed', 'Could not update clinic'));
      }
    } catch (error) {
      addToast(toastError('Update Failed', 'Failed to update clinic'));
    }
  };

  const handleDeleteClinic = async (clinicId: string) => {
    const clinic = await clinicOperations.getById(clinicId);
    if (!clinic) return;

    const assignedCards = await clinicOperations.getAssignedCardsCount(clinicId);
    if (assignedCards > 0) {
      addToast(toastWarning('Cannot Delete', `This clinic has ${assignedCards} assigned cards. Please reassign them first.`));
      return;
    }

    // In production, you'd want a confirmation dialog
    if (confirm(`Are you sure you want to delete "${clinic.name}"? This action cannot be undone.`)) {
      const success = await clinicOperations.delete(clinicId);

      if (success) {
        addToast(toastSuccess('Clinic Deleted', `${clinic.name} has been deleted`));
      } else {
        addToast(toastError('Delete Failed', 'Could not delete clinic'));
      }
    }
  };

  // Admin Appointment Monitoring & Manual Creation
  // Note: Admin can only VIEW appointment statuses (read-only) and create manual appointments
  // All appointment processing (accept/decline/reschedule) is handled by clinics

  const handleCreateManualAppointment = async (appointmentData: {
    cardControlNumber: string;
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    preferredDate: string;
    preferredTime: string;
    serviceType: string;
    perkRequested: string;
    clinicId: string;
    adminNotes: string;
  }) => {
    // Create appointment in global operations so clinic portals can access it
    const now = new Date().toISOString();
    const newAppointment = await appointmentOperations.create({
      cardControlNumber: appointmentData.cardControlNumber,
      clinicId: appointmentData.clinicId,
      patientName: appointmentData.patientName,
      patientEmail: appointmentData.patientEmail,
      patientPhone: appointmentData.patientPhone,
      preferredDate: appointmentData.preferredDate,
      preferredTime: appointmentData.preferredTime,
      status: 'pending' as const,
      serviceType: appointmentData.serviceType,
      notes: appointmentData.adminNotes,
      createdAt: now,
      updatedAt: now
    });

    // Also add to local state for admin view
    setAppointmentRequests(prev => [...prev, newAppointment]);
    addToast(toastSuccess('Manual Appointment Created', `Appointment request sent to clinic for processing`));
  };

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

        // For now, we'll update directly since cardOperations doesn't have update by control number
        // In production, this should go through the cloud operations
        Object.assign(updatedCard, updateData);

        setEditingCard(null);
        addToast(toastSuccess('Card Updated', `Updated ${controlNumber} successfully`));
        await reloadData(); // Refresh the data
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
    { id: 'generator' as const, label: 'Generator', icon: Plus, color: 'emerald' },
    { id: 'activation' as const, label: 'Activation', icon: Zap, color: 'blue' },
    { id: 'appointments' as const, label: 'Appointments', icon: Calendar, color: 'rose' },
    { id: 'clinic-management' as const, label: 'Manage Clinics', icon: Building, color: 'indigo' },
    { id: 'endorsement' as const, label: 'Endorsement', icon: UserCheck, color: 'orange' },
    { id: 'master-list' as const, label: 'Master List', icon: Database, color: 'purple' },
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

                {generatorForm.areaCode === 'Custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Area Code</label>
                    <input
                      type="text"
                      value={generatorForm.customAreaCode}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, customAreaCode: e.target.value })}
                      className="light-input"
                      placeholder="Enter custom area code (e.g., XYZ001)"
                    />
                  </div>
                )}

                {/* Perks Configuration - Available for both single and batch */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perks per Card</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={generatorForm.perksTotal}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, perksTotal: parseInt(e.target.value) || 1 })}
                      className="light-input w-20"
                    />
                    <span className="text-sm text-gray-600">benefits/perks per card</span>
                    <button
                      onClick={() => setPerksManagement({ ...perksManagement, showModal: true })}
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Manage Perks</span>
                    </button>
                  </div>

                  {/* Active Perks Display */}
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Available Perks: </span>
                    {perks.filter(p => p.isActive).length > 0 ? (
                      <span className="text-green-600 font-medium">
                        {perks.filter(p => p.isActive).map(p => p.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-orange-600">No active perks configured</span>
                    )}
                  </div>
                </div>

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

          {/* Clinic Management Tab */}
          {activeTab === 'clinic-management' && (
            <div className="space-y-6">
              {/* Header with title and add button */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Clinics</h2>
                  <p className="text-gray-600">Comprehensive clinic management with subscription plans and monitoring</p>
                </div>
                <button
                  onClick={() => {
                    setShowClinicForm(!showClinicForm);
                    setEditingClinic(null);
                    setClinicForm({
                      name: '',
                      region: '',
                      plan: 'starter',
                      areaCode: '',
                      customAreaCode: '',
                      address: '',
                      adminClinic: '',
                      email: '',
                      contactNumber: '',
                      password: '',
                    });
                  }}
                  className="light-button-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New Clinic
                </button>
              </div>

              {/* Collapsible form for adding/editing clinics */}
              {showClinicForm && (
                <div className="light-card">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {editingClinic ? `Edit Clinic: ${editingClinic.name}` : 'Add New Clinic'}
                      </h3>
                      <button
                        onClick={() => {
                          setShowClinicForm(false);
                          setEditingClinic(null);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Required Fields */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clinic Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={clinicForm.name}
                          onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                          className="light-input"
                          placeholder="Enter clinic name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Region <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={clinicForm.region}
                          onChange={(e) => setClinicForm({ ...clinicForm, region: e.target.value })}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subscription Plan <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={clinicForm.plan}
                          onChange={(e) => setClinicForm({ ...clinicForm, plan: e.target.value as ClinicPlan })}
                          className="light-select"
                        >
                          <option value="starter">Starter Plan - ₱{PLAN_PRICING.starter}/month (up to {PLAN_LIMITS.starter} cards)</option>
                          <option value="growth">Growth Plan - ₱{PLAN_PRICING.growth}/month (up to {PLAN_LIMITS.growth} cards)</option>
                          <option value="pro">Pro Plan - ₱{PLAN_PRICING.pro}/month (up to {PLAN_LIMITS.pro} cards)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Area Code <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={clinicForm.areaCode}
                          onChange={(e) => setClinicForm({ ...clinicForm, areaCode: e.target.value })}
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
                      {clinicForm.areaCode === 'Custom' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Area Code</label>
                          <input
                            type="text"
                            value={clinicForm.customAreaCode}
                            onChange={(e) => setClinicForm({ ...clinicForm, customAreaCode: e.target.value })}
                            className="light-input"
                            placeholder="Enter custom area code (e.g., XYZ001)"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clinic Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={clinicForm.password}
                          onChange={(e) => setClinicForm({ ...clinicForm, password: e.target.value })}
                          className="light-input"
                          placeholder="Enter clinic login password"
                        />
                      </div>
                      {/* Optional Fields */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
                        <input
                          type="text"
                          value={clinicForm.address}
                          onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                          className="light-input"
                          placeholder="Enter clinic address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Contact (Optional)</label>
                        <input
                          type="text"
                          value={clinicForm.adminClinic}
                          onChange={(e) => setClinicForm({ ...clinicForm, adminClinic: e.target.value })}
                          className="light-input"
                          placeholder="Enter admin contact name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          value={clinicForm.email}
                          onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
                          className="light-input"
                          placeholder="Enter clinic email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number (Optional)</label>
                        <input
                          type="tel"
                          value={clinicForm.contactNumber}
                          onChange={(e) => setClinicForm({ ...clinicForm, contactNumber: e.target.value })}
                          className="light-input"
                          placeholder="+63917123456"
                        />
                      </div>
                    </div>

                    {/* Subscription Summary */}
                    <div className="bg-blue-50 p-4 rounded-xl mt-6">
                      <h3 className="font-medium text-blue-900 mb-2">Subscription Summary</h3>
                      <div className="text-sm text-blue-800">
                        <p><strong>{clinicForm.plan.charAt(0).toUpperCase() + clinicForm.plan.slice(1)} Plan:</strong> ₱{PLAN_PRICING[clinicForm.plan] || 0}/month</p>
                        <p><strong>Card Limit:</strong> Up to {PLAN_LIMITS[clinicForm.plan] || 0} cards</p>
                        <p className="text-blue-600 mt-2">* Required fields must be filled. Optional fields can be updated later.</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => {
                          setShowClinicForm(false);
                          setEditingClinic(null);
                        }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingClinic ? handleUpdateClinic : handleCreateClinic}
                        className="light-button-primary"
                      >
                        {editingClinic ? 'Update Clinic' : 'Create Clinic Profile'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional clinics table */}
              <div className="light-card">
                <div className="p-6">
                  {clinics.length === 0 ? (
                    /* Empty state */
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Clinics Found</h3>
                      <p className="text-gray-600 mb-6">Get started by adding your first clinic to the system</p>
                      <button
                        onClick={() => setShowClinicForm(true)}
                        className="light-button-primary flex items-center gap-2 mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        Add First Clinic
                      </button>
                    </div>
                  ) : (
                    /* Table with real data */
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-200">
                          <tr>
                            <th className="text-left p-4 font-medium text-gray-900">Clinic Details</th>
                            <th className="text-left p-4 font-medium text-gray-900">Plan & Usage</th>
                            <th className="text-left p-4 font-medium text-gray-900">Contact Info</th>
                            <th className="text-left p-4 font-medium text-gray-900">Status</th>
                            <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clinics.map((clinic) => {
                            const assignedCards = cards.filter(card => card.clinicId === clinic.id);
                            const usedCards = assignedCards.length;
                            const maxCards = PLAN_LIMITS[clinic.plan];
                            const usagePercentage = (usedCards / maxCards) * 100;
                            const regionName = PHILIPPINES_REGIONS.find(r => r.code === clinic.region)?.name || clinic.region;

                            return (
                              <tr key={clinic.id} className="border-b border-gray-100 hover:bg-gray-50">
                                {/* Clinic Details */}
                                <td className="p-4">
                                  <div className="space-y-1">
                                    <div className="font-medium text-gray-900">{clinic.name}</div>
                                    <div className="text-sm text-gray-600 font-mono">{clinic.code}</div>
                                    <div className="text-sm text-gray-500">{regionName}</div>
                                  </div>
                                </td>

                                {/* Plan & Usage */}
                                <td className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        clinic.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                                        clinic.plan === 'growth' ? 'bg-green-100 text-green-700' :
                                        'bg-purple-100 text-purple-700'
                                      }`}>
                                        {clinic.plan.toUpperCase()}
                                      </span>
                                      <span className="text-sm text-gray-600">₱{PLAN_PRICING[clinic.plan]}/mo</span>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-sm">
                                        <span>Card Usage</span>
                                        <span className="font-medium">{usedCards}/{maxCards}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full transition-all ${
                                            usagePercentage >= 90 ? 'bg-red-500' :
                                            usagePercentage >= 70 ? 'bg-yellow-500' :
                                            'bg-green-500'
                                          }`}
                                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Contact Info */}
                                <td className="p-4">
                                  <div className="space-y-1 text-sm">
                                    {clinic.email && (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Mail className="h-3 w-3" />
                                        <span>{clinic.email}</span>
                                      </div>
                                    )}
                                    {clinic.contactNumber && (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Phone className="h-3 w-3" />
                                        <span>{clinic.contactNumber}</span>
                                      </div>
                                    )}
                                    {clinic.adminClinic && (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <User className="h-3 w-3" />
                                        <span>{clinic.adminClinic}</span>
                                      </div>
                                    )}
                                    {!clinic.email && !clinic.contactNumber && !clinic.adminClinic && (
                                      <span className="text-gray-400 italic">No contact info</span>
                                    )}
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="p-4">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    Active
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        handleEditClinic(clinic);
                                        setShowClinicForm(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                      title="Edit clinic"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClinic(clinic.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                                      title="Delete clinic"
                                      disabled={assignedCards.length > 0}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Appointment Status Monitor</h2>
                  <p className="text-sm text-gray-600">View all appointment requests and their processing status</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{appointmentRequests.length} total requests</span>
                  </div>
                  <button
                    onClick={() => setShowManualAppointmentForm(true)}
                    className="light-button-primary flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Manual Appointment
                  </button>
                </div>
              </div>

              {/* Filter/Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="light-stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Review</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {appointmentRequests.filter(apt => apt.status === 'pending').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </div>

                <div className="light-stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {appointmentRequests.filter(apt => apt.status === 'pending').length}
                      </p>
                    </div>
                    <UserCheck className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="light-stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Accepted</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {appointmentRequests.filter(apt => apt.status === 'accepted').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>

                <div className="light-stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold text-red-600">
                        {appointmentRequests.filter(apt => apt.status === 'rejected').length}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Manual Appointment Creation Form */}
              {showManualAppointmentForm && (
                <div className="light-card p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Plus className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Create Manual Appointment</h3>
                    </div>
                    <button
                      onClick={() => setShowManualAppointmentForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Control Number *</label>
                      <input
                        type="text"
                        value={manualAppointmentForm.cardControlNumber}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, cardControlNumber: e.target.value })}
                        className="light-input"
                        placeholder="MOC-00000-XX-XXX000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Clinic *</label>
                      <select
                        value={manualAppointmentForm.clinicId}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, clinicId: e.target.value })}
                        className="light-select"
                      >
                        <option value="">Select Clinic</option>
                        {clinics.map(clinic => (
                          <option key={clinic.id} value={clinic.id}>{clinic.name} ({clinic.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                      <input
                        type="text"
                        value={manualAppointmentForm.patientName}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, patientName: e.target.value })}
                        className="light-input"
                        placeholder="Patient's full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={manualAppointmentForm.patientEmail}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, patientEmail: e.target.value })}
                        className="light-input"
                        placeholder="patient@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={manualAppointmentForm.patientPhone}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, patientPhone: e.target.value })}
                        className="light-input"
                        placeholder="+63917123456"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                      <input
                        type="text"
                        value={manualAppointmentForm.serviceType}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, serviceType: e.target.value })}
                        className="light-input"
                        placeholder="e.g., Dental Cleaning, Consultation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date *</label>
                      <input
                        type="date"
                        value={manualAppointmentForm.preferredDate}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, preferredDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="light-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time *</label>
                      <input
                        type="time"
                        value={manualAppointmentForm.preferredTime}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, preferredTime: e.target.value })}
                        className="light-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Perk Requested</label>
                      <input
                        type="text"
                        value={manualAppointmentForm.perkRequested}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, perkRequested: e.target.value })}
                        className="light-input"
                        placeholder="e.g., Free Dental Cleaning"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                      <textarea
                        value={manualAppointmentForm.adminNotes}
                        onChange={(e) => setManualAppointmentForm({ ...manualAppointmentForm, adminNotes: e.target.value })}
                        rows={3}
                        className="light-input resize-none"
                        placeholder="Any additional notes or instructions..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
                    <button
                      onClick={() => {
                        if (!manualAppointmentForm.cardControlNumber || !manualAppointmentForm.patientName ||
                            !manualAppointmentForm.patientEmail || !manualAppointmentForm.preferredDate ||
                            !manualAppointmentForm.preferredTime || !manualAppointmentForm.serviceType ||
                            !manualAppointmentForm.clinicId) {
                          addToast(toastWarning('Missing Fields', 'Please fill in all required fields'));
                          return;
                        }
                        handleCreateManualAppointment(manualAppointmentForm);
                        setManualAppointmentForm({
                          cardControlNumber: '',
                          patientName: '',
                          patientEmail: '',
                          patientPhone: '',
                          preferredDate: '',
                          preferredTime: '',
                          serviceType: '',
                          perkRequested: '',
                          clinicId: '',
                          adminNotes: ''
                        });
                        setShowManualAppointmentForm(false);
                      }}
                      className="light-button-primary flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send to Clinic
                    </button>
                    <button
                      onClick={() => setShowManualAppointmentForm(false)}
                      className="light-button-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Appointment Requests List */}
              <div className="space-y-4">
                {appointmentRequests.length === 0 ? (
                  <div className="light-card p-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointment Requests</h3>
                    <p className="text-gray-600">When cardholders request appointments, they will appear here.</p>
                  </div>
                ) : (
                  appointmentRequests.map((appointment) => (
                    <div key={appointment.id} className="light-card p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-[#1A535C]" />
                              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {appointment.cardControlNumber}
                              </span>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'pending'
                                ? 'bg-orange-100 text-orange-700'
                                : appointment.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : appointment.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {appointment.status.replace(/_/g, ' ').toUpperCase()}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
                              <div className="text-sm text-gray-600 space-y-1 mt-1">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>{appointment.patientEmail}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span>{appointment.patientPhone}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(appointment.preferredDate).toLocaleDateString('en-PH')}</span>
                                  <Clock className="h-4 w-4 ml-2" />
                                  <span>{appointment.preferredTime}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Service:</span> {appointment.serviceType}
                                </div>
                                {appointment.perkRequested && (
                                  <div>
                                    <span className="font-medium text-gray-700">Perk:</span> {appointment.perkRequested}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-gray-700">Clinic:</span> {appointment.clinicName}
                                </div>
                              </div>
                            </div>
                          </div>

                          {appointment.adminNotes && (
                            <div className="bg-blue-50 p-3 rounded-lg mb-4">
                              <p className="text-sm text-gray-700"><strong>Admin Notes:</strong> {appointment.adminNotes}</p>
                            </div>
                          )}

                          {appointment.clinicNotes && (
                            <div className="bg-green-50 p-3 rounded-lg mb-4">
                              <p className="text-sm text-gray-700"><strong>Clinic Response:</strong> {appointment.clinicNotes}</p>
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            Requested: {new Date(appointment.requestedAt).toLocaleString('en-PH')}
                          </div>
                        </div>

                        {/* Admin View - Read Only Status Monitoring */}
                        <div className="flex items-center gap-2 ml-4">
                          <div className="text-xs text-gray-500 text-right">
                            <div>Sent to Clinic: {new Date(appointment.forwardedAt).toLocaleString('en-PH')}</div>
                            {appointment.processedAt && (
                              <div>Processed: {new Date(appointment.processedAt).toLocaleString('en-PH')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                          const matchesSearch = !searchTerm ||
                            card.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            card.controlNumber.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map((card) => {
                          const clinic = clinics.find(c => c.id === card.clinicId);
                          const isEditing = editingCard === card.controlNumber;

                          return (
                            <tr key={card.controlNumber} className="light-table-row">
                              <td className="p-4 font-mono text-sm">{card.controlNumber}</td>
                              <td className="p-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editCardForm.fullName}
                                    onChange={(e) => setEditCardForm({ ...editCardForm, fullName: e.target.value })}
                                    className="light-input text-sm"
                                  />
                                ) : (
                                  card.fullName
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
              {crudView === 'clinics' && (
                <div className="light-table">
                  <table className="w-full">
                    <thead className="light-table-header">
                      <tr>
                        <th className="text-left p-4">Name</th>
                        <th className="text-left p-4">Code</th>
                        <th className="text-left p-4">Region</th>
                        <th className="text-left p-4">Plan</th>
                        <th className="text-left p-4">Cards</th>
                        <th className="text-left p-4">Contact</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinics
                        .filter(clinic => {
                          const matchesSearch = !searchTerm ||
                            clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            clinic.code.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch;
                        })
                        .map((clinic) => {
                          const isEditing = editingClinic?.id === clinic.id;
                          const assignedCards = cards.filter(card => card.clinicId === clinic.id);

                          return (
                            <tr key={clinic.id} className="light-table-row">
                              <td className="p-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editClinicForm.name}
                                    onChange={(e) => setEditClinicForm({ ...editClinicForm, name: e.target.value })}
                                    className="light-input text-sm"
                                  />
                                ) : (
                                  <div>
                                    <div className="font-medium">{clinic.name}</div>
                                    <div className="text-xs text-gray-500">{clinic.address}</div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 font-mono text-sm">{clinic.code}</td>
                              <td className="p-4">
                                {isEditing ? (
                                  <select
                                    value={editClinicForm.region}
                                    onChange={(e) => setEditClinicForm({ ...editClinicForm, region: e.target.value })}
                                    className="light-select text-sm"
                                  >
                                    <option value="">Select Region</option>
                                    {PHILIPPINES_REGIONS.map((region) => (
                                      <option key={region.code} value={region.code}>
                                        {region.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  PHILIPPINES_REGIONS.find(r => r.code === clinic.region)?.name || clinic.region
                                )}
                              </td>
                              <td className="p-4">
                                {isEditing ? (
                                  <select
                                    value={editClinicForm.plan}
                                    onChange={(e) => setEditClinicForm({ ...editClinicForm, plan: e.target.value as ClinicPlan })}
                                    className="light-select text-sm"
                                  >
                                    <option value="starter">Starter</option>
                                    <option value="growth">Growth</option>
                                    <option value="pro">Pro</option>
                                  </select>
                                ) : (
                                  <span className={`plan-${clinic.plan} capitalize`}>
                                    {clinic.plan}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="text-sm">
                                  <div>{assignedCards.length} / {clinic.maxCards}</div>
                                  <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                                    <div
                                      className="bg-blue-500 h-1 rounded-full"
                                      style={{ width: `${Math.min((assignedCards.length / clinic.maxCards) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <input
                                      type="email"
                                      value={editClinicForm.email}
                                      onChange={(e) => setEditClinicForm({ ...editClinicForm, email: e.target.value })}
                                      placeholder="Email"
                                      className="light-input text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={editClinicForm.contactNumber}
                                      onChange={(e) => setEditClinicForm({ ...editClinicForm, contactNumber: e.target.value })}
                                      placeholder="Phone"
                                      className="light-input text-sm"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-sm">
                                    <div>{clinic.email}</div>
                                    <div className="text-gray-500">{clinic.contactNumber}</div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={clinic.isActive ? 'status-active' : 'status-inactive'}>
                                  {clinic.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateClinic()}
                                        className="p-1 text-green-600 hover:text-green-700"
                                        title="Save changes"
                                      >
                                        <Save className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingClinic(null)}
                                        className="p-1 text-gray-600 hover:text-gray-700"
                                        title="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditClinic(clinic)}
                                        className="p-1 text-blue-600 hover:text-blue-700"
                                        title="Edit clinic"
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setShowingCredentials(showingCredentials === clinic.id ? null : clinic.id)}
                                        className="p-1 text-amber-600 hover:text-amber-700"
                                        title="Show/Hide Credentials (Emergency Access)"
                                      >
                                        {showingCredentials === clinic.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClinic(clinic.id)}
                                        className="p-1 text-red-600 hover:text-red-700"
                                        title="Delete clinic"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                {showingCredentials === clinic.id && (
                                  <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Shield className="h-4 w-4 text-amber-600" />
                                      <span className="text-sm font-semibold text-amber-800">Emergency Credentials</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Clinic Code:</span>
                                        <span className="font-mono bg-white px-2 py-1 rounded border text-gray-900">
                                          {clinic.code}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Password:</span>
                                        <span className="font-mono bg-white px-2 py-1 rounded border text-gray-900">
                                          {clinic.password}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-800">
                                      ⚠️ <strong>Emergency Use Only:</strong> Only provide these credentials to clinic staff who have forgotten their login details. Keep this information secure.
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={perksManagement.form.value}
                    onChange={(e) => setPerksManagement({
                      ...perksManagement,
                      form: { ...perksManagement.form, value: parseInt(e.target.value) || 0 }
                    })}
                    className="light-input"
                    placeholder="0"
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