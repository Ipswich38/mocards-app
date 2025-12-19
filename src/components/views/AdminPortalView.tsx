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
  CheckCircle,
  Building,
  Calendar,
  Clock,
  Phone,
  Mail
} from 'lucide-react';
import {
  cardOperations,
  clinicOperations,
  PHILIPPINES_REGIONS,
  AREA_CODES,
  PLAN_LIMITS,
  PLAN_PRICING,
  generateControlNumber,
  generateClinicCode,
  type Card,
  type Clinic,
  type ClinicPlan
} from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

type AdminTab = 'generator' | 'activation' | 'endorsement' | 'appointments' | 'clinic-management' | 'master-list';

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
    customAreaCode: '',
    startId: '',
    endId: '',
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

  // Appointment Management State
  const [appointmentRequests, setAppointmentRequests] = useState([
    // Mock appointment requests
    {
      id: '1',
      controlNumber: 'MOC-00001-01-CVT001',
      patientName: 'Juan Dela Cruz',
      patientEmail: 'juan@email.com',
      patientPhone: '+63917123456',
      requestedDate: '2024-12-20',
      requestedTime: '10:00',
      perkType: 'dental_cleaning',
      status: 'pending_admin_review',
      requestedAt: '2024-12-19T08:00:00.000Z',
      clinicId: '1',
      clinicName: 'Central Valley Clinic',
      notes: 'Requesting free dental cleaning appointment'
    },
    {
      id: '2',
      controlNumber: 'MOC-00002-NCR-CVT002',
      patientName: 'Maria Santos',
      patientEmail: 'maria@email.com',
      patientPhone: '+63917234567',
      requestedDate: '2024-12-21',
      requestedTime: '14:00',
      perkType: 'consultation',
      status: 'sent_to_clinic',
      requestedAt: '2024-12-18T09:00:00.000Z',
      clinicId: '2',
      clinicName: 'Manila General Hospital',
      notes: 'Need consultation for dental pain'
    }
  ]);

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

      // Handle custom area code
      let finalAreaCode = generatorForm.areaCode;
      if (generatorForm.areaCode === 'Custom' && generatorForm.customAreaCode) {
        finalAreaCode = generatorForm.customAreaCode;
      }

      const newId = cardOperations.getAll().length + 1;
      const controlNumber = generateControlNumber(newId, generatorForm.region, finalAreaCode);

      const newCard: Omit<Card, 'id' | 'createdAt' | 'updatedAt'> = {
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

      // Handle custom area code
      let finalAreaCode = generatorForm.areaCode;
      if (generatorForm.areaCode === 'Custom' && generatorForm.customAreaCode) {
        finalAreaCode = generatorForm.customAreaCode;
      }

      const cards = cardOperations.createBatch(start, end, generatorForm.region, finalAreaCode);
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

  const handleCreateClinic = () => {
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
    const clinicCode = generateClinicCode(finalAreaCode);

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

      const createdClinic = clinicOperations.create(newClinic);

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
    } catch (error) {
      addToast(toastError('Creation Failed', 'Failed to create clinic'));
    }
  };

  // Appointment Management Handlers
  const handleApproveAppointment = (appointmentId: string) => {
    setAppointmentRequests(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? { ...apt, status: 'sent_to_clinic' }
          : apt
      )
    );
    addToast(toastSuccess('Appointment Approved', 'Request forwarded to clinic'));
  };

  const handleRejectAppointment = (appointmentId: string, reason: string) => {
    setAppointmentRequests(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? { ...apt, status: 'rejected_by_admin', rejectionReason: reason }
          : apt
      )
    );
    addToast(toastWarning('Appointment Rejected', 'Patient will be notified'));
  };

  const handleRescheduleAppointment = (appointmentId: string, newDate: string, newTime: string) => {
    setAppointmentRequests(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? {
            ...apt,
            status: 'rescheduled_by_admin',
            requestedDate: newDate,
            requestedTime: newTime,
            originalDate: apt.requestedDate,
            originalTime: apt.requestedTime
          }
          : apt
      )
    );
    addToast(toastSuccess('Appointment Rescheduled', 'Updated request sent to clinic'));
  };

  const tabs = [
    { id: 'generator' as const, label: 'Generator', icon: Plus, color: 'emerald' },
    { id: 'activation' as const, label: 'Activation', icon: Zap, color: 'blue' },
    { id: 'appointments' as const, label: 'Appointments', icon: Calendar, color: 'rose' },
    { id: 'clinic-management' as const, label: 'Add Clinic', icon: Building, color: 'indigo' },
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

          {/* Clinic Management Tab */}
          {activeTab === 'clinic-management' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Add Clinic</h2>
              <p className="text-gray-600">Create a new clinic profile and assign subscription plan</p>

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

              <div className="bg-blue-50 p-4 rounded-xl">
                <h3 className="font-medium text-blue-900 mb-2">Subscription Summary</h3>
                <div className="text-sm text-blue-800">
                  <p><strong>{clinicForm.plan.charAt(0).toUpperCase() + clinicForm.plan.slice(1)} Plan:</strong> ₱{PLAN_PRICING[clinicForm.plan] || 0}/month</p>
                  <p><strong>Card Limit:</strong> Up to {PLAN_LIMITS[clinicForm.plan] || 0} cards</p>
                  <p className="text-blue-600 mt-2">* Required fields must be filled. Optional fields can be updated later.</p>
                </div>
              </div>

              <button onClick={handleCreateClinic} className="light-button-primary">
                Create Clinic Profile
              </button>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Appointment Requests</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{appointmentRequests.length} total requests</span>
                </div>
              </div>

              {/* Filter/Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="light-stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Review</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {appointmentRequests.filter(apt => apt.status === 'pending_admin_review').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </div>

                <div className="light-stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Sent to Clinic</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {appointmentRequests.filter(apt => apt.status === 'sent_to_clinic').length}
                      </p>
                    </div>
                    <UserCheck className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="light-stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {appointmentRequests.filter(apt => apt.status === 'approved_by_clinic').length}
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
                        {appointmentRequests.filter(apt => apt.status.includes('rejected')).length}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

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
                                {appointment.controlNumber}
                              </span>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'pending_admin_review'
                                ? 'bg-orange-100 text-orange-700'
                                : appointment.status === 'sent_to_clinic'
                                ? 'bg-blue-100 text-blue-700'
                                : appointment.status === 'approved_by_clinic'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
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
                                  <span>{new Date(appointment.requestedDate).toLocaleDateString('en-PH')}</span>
                                  <Clock className="h-4 w-4 ml-2" />
                                  <span>{appointment.requestedTime}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Perk:</span> {appointment.perkType.replace(/_/g, ' ').toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Clinic:</span> {appointment.clinicName}
                                </div>
                              </div>
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-4">
                              <p className="text-sm text-gray-700"><strong>Patient Notes:</strong> {appointment.notes}</p>
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            Requested: {new Date(appointment.requestedAt).toLocaleString('en-PH')}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {appointment.status === 'pending_admin_review' && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleApproveAppointment(appointment.id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Approve & Forward
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason:');
                                if (reason) handleRejectAppointment(appointment.id, reason);
                              }}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                const newDate = prompt('New date (YYYY-MM-DD):');
                                const newTime = prompt('New time (HH:MM):');
                                if (newDate && newTime) handleRescheduleAppointment(appointment.id, newDate, newTime);
                              }}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Reschedule
                            </button>
                          </div>
                        )}
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