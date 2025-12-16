import { useState, useEffect } from 'react';
import {
  Search,
  Camera,
  Sparkles,
  Plus,
  Users,
  CreditCard,
  Building2,
  UserCheck,
  Calendar,
  Database,
  CheckCircle,
  X,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import {
  CardData,
  Clinic,
  Appointment,
  ClinicPlan,
  cardOperations,
  clinicOperations,
  appointmentOperations,
  REGIONS,
  AREA_CODES,
  PLAN_LIMITS,
  generateControlNumber,
  getStatusBadgeColor,
} from '../lib/data';

type AppModule = 'generator' | 'activate' | 'mocards' | 'clinics' | 'endorse' | 'calendar';

interface MOCARDSCloudAdminProps {
  onBack?: () => void;
}

export function MOCARDSCloudAdmin({ onBack }: MOCARDSCloudAdminProps = {}) {
  // Global State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CardData[]>([]);
  const [activeApp, setActiveApp] = useState<AppModule | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'clinic' | 'appointment' | 'perks' | null>(null);

  // Data State
  const [cards, setCards] = useState<CardData[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Form States
  const [generatorForm, setGeneratorForm] = useState({
    mode: 'single' as 'single' | 'batch',
    fullName: '',
    region: '',
    areaCode: '',
    customAreaCode: '',
    idStart: '',
    idEnd: '',
    type: 'Premium',
  });

  const [clinicForm, setClinicForm] = useState({
    name: '',
    region: '',
    code: '',
    plan: 'starter' as ClinicPlan,
    address: '',
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patientName: '',
    cardControlNumber: '',
    date: '',
    time: '',
    clinicId: '',
  });

  const [endorseForm, setEndorseForm] = useState({
    cardControlNumber: '',
    clinicId: '',
  });

  const [activateForm, setActivateForm] = useState({
    searchQuery: '',
    selectedCard: null as CardData | null,
  });

  const [perksForm, setPerksForm] = useState({
    perksUsed: 0,
    perksTotal: 0,
    selectedCard: null as CardData | null,
  });

  // Load initial data
  useEffect(() => {
    setCards(cardOperations.getAll());
    setClinics(clinicOperations.getAll());
    setAppointments(appointmentOperations.getAll());
    setSearchResults(cardOperations.getAll());
  }, []);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults(cardOperations.getAll());
    } else {
      setSearchResults(cardOperations.searchByQuery(searchQuery));
    }
  }, [searchQuery, cards]);

  // Toast notification function (simulated)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // In real implementation, use sonner here
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(`${type.toUpperCase()}: ${message}`);
  };

  // Generator Functions
  const handleGenerateCards = () => {
    try {
      const areaCode = generatorForm.customAreaCode || generatorForm.areaCode;

      if (generatorForm.mode === 'single') {
        const nextId = (cards.length + 1).toString();
        const controlNumber = generateControlNumber(nextId, generatorForm.region, areaCode);
        const clinic = clinics.find(c => c.code === areaCode);

        cardOperations.create({
          controlNumber,
          fullName: generatorForm.fullName,
          status: 'inactive',
          clinicId: clinic?.id || '',
          clinicName: clinic?.name || 'Unassigned',
          perksTotal: 5,
          perksUsed: 0,
          expiryDate: '2025-12-31',
          type: generatorForm.type,
        });

        setCards(cardOperations.getAll());
        showToast(`Card generated: ${controlNumber}`);
      } else {
        // Batch generation
        const start = parseInt(generatorForm.idStart);
        const end = parseInt(generatorForm.idEnd);
        let generated = 0;

        for (let i = start; i <= end; i++) {
          const controlNumber = generateControlNumber(i.toString(), generatorForm.region, areaCode);
          const clinic = clinics.find(c => c.code === areaCode);

          cardOperations.create({
            controlNumber,
            fullName: `Generated User ${i}`,
            status: 'inactive',
            clinicId: clinic?.id || '',
            clinicName: clinic?.name || 'Unassigned',
            perksTotal: 5,
            perksUsed: 0,
            expiryDate: '2025-12-31',
            type: generatorForm.type,
          });
          generated++;
        }

        setCards(cardOperations.getAll());
        showToast(`Generated ${generated} cards successfully`);
      }

      // Reset form
      setGeneratorForm({
        mode: 'single',
        fullName: '',
        region: '',
        areaCode: '',
        customAreaCode: '',
        idStart: '',
        idEnd: '',
        type: 'Premium',
      });
    } catch (error) {
      showToast('Failed to generate cards', 'error');
    }
  };

  // Clinic Functions
  const handleCreateClinic = () => {
    try {
      clinicOperations.create(clinicForm);
      setClinics(clinicOperations.getAll());
      setShowDialog(false);
      showToast(`Clinic ${clinicForm.name} created successfully`);

      setClinicForm({
        name: '',
        region: '',
        code: '',
        plan: 'starter',
        address: '',
      });
    } catch (error) {
      showToast('Failed to create clinic', 'error');
    }
  };

  // Endorse Functions
  const handleEndorseCard = () => {
    try {
      const clinic = clinics.find(c => c.id === endorseForm.clinicId);
      if (!clinic) throw new Error('Clinic not found');

      cardOperations.assignToClinic(endorseForm.cardControlNumber, endorseForm.clinicId);
      setCards(cardOperations.getAll());
      showToast(`Card assigned to ${clinic.name}`);

      setEndorseForm({ cardControlNumber: '', clinicId: '' });
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // Activate Functions
  const handleSearchCard = () => {
    const card = cardOperations.getByControlNumber(activateForm.searchQuery);
    setActivateForm(prev => ({ ...prev, selectedCard: card || null }));

    if (!card) {
      showToast('Card not found', 'error');
    }
  };

  const handleToggleCardStatus = () => {
    if (activateForm.selectedCard) {
      const newStatus = activateForm.selectedCard.status === 'active' ? 'inactive' : 'active';
      cardOperations.update(activateForm.selectedCard.controlNumber, { status: newStatus });
      setCards(cardOperations.getAll());
      setActivateForm(prev => ({
        ...prev,
        selectedCard: prev.selectedCard ? { ...prev.selectedCard, status: newStatus } : null
      }));
      showToast(`Card ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    }
  };

  // Perks Functions
  const handleUpdatePerks = () => {
    if (perksForm.selectedCard) {
      cardOperations.update(perksForm.selectedCard.controlNumber, {
        perksUsed: perksForm.perksUsed,
        perksTotal: perksForm.perksTotal,
      });
      setCards(cardOperations.getAll());
      setShowDialog(false);
      showToast('Perks updated successfully');
    }
  };

  const openPerksDialog = (card: CardData) => {
    setPerksForm({
      perksUsed: card.perksUsed,
      perksTotal: card.perksTotal,
      selectedCard: card,
    });
    setDialogType('perks');
    setShowDialog(true);
  };

  // Appointment Functions
  const handleCreateAppointment = () => {
    try {
      appointmentOperations.create({
        patientName: appointmentForm.patientName,
        cardControlNumber: appointmentForm.cardControlNumber,
        date: appointmentForm.date,
        time: appointmentForm.time,
        clinicId: appointmentForm.clinicId,
        status: 'scheduled',
      });

      setAppointments(appointmentOperations.getAll());
      setShowDialog(false);
      showToast('Appointment scheduled successfully');

      setAppointmentForm({
        patientName: '',
        cardControlNumber: '',
        date: '',
        time: '',
        clinicId: '',
      });
    } catch (error) {
      showToast('Failed to create appointment', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Google-Style Search Header */}
      <div className="bg-[#202124] text-white min-h-[400px] flex flex-col items-center justify-center px-4 relative">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#303134] text-gray-300 hover:bg-[#3c4043] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Main</span>
          </button>
        )}

        {/* MOCARDS Title */}
        <div className="text-6xl md:text-8xl font-light mb-8 tracking-wide">
          <span className="text-[#1A535C]">MOC</span>
          <span className="text-white">ARDS</span>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl mb-8">
          <div className="relative bg-[#303134] rounded-full border border-[#5f6368] hover:border-[#8ab4f8] focus-within:border-[#8ab4f8] h-14 flex items-center px-4">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Search cards by Control Number, Name, or Clinic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
            />
            <div className="flex items-center space-x-3 ml-3">
              <Camera className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer" />
              <Sparkles className="h-5 w-5 text-gray-400 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Search Buttons */}
        <div className="flex space-x-4">
          <button className="bg-[#303134] text-gray-300 px-6 py-3 rounded border border-[#303134] hover:border-gray-500 hover:bg-[#3c4043]">
            MOCARDS Search
          </button>
          <button
            onClick={() => setSearchQuery(cards[Math.floor(Math.random() * cards.length)]?.controlNumber || '')}
            className="bg-[#303134] text-gray-300 px-6 py-3 rounded border border-[#303134] hover:border-gray-500 hover:bg-[#3c4043]"
          >
            I'm Feeling Lucky
          </button>
        </div>

        {/* Search Results Table */}
        {searchQuery && (
          <div className="w-full max-w-6xl mt-8 bg-[#171717] rounded-[32px] p-6">
            <h3 className="text-xl font-medium mb-4">Card Registry Results</h3>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CreditCard className="h-12 w-12 mx-auto mb-4" />
                <p>No matching cards found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 text-[#1A535C] font-medium">Control Number</th>
                      <th className="text-left py-3 text-gray-300 font-medium">Patient Name</th>
                      <th className="text-left py-3 text-gray-300 font-medium">Status</th>
                      <th className="text-left py-3 text-gray-300 font-medium">Clinic</th>
                      <th className="text-left py-3 text-gray-300 font-medium">Type</th>
                      <th className="text-left py-3 text-gray-300 font-medium">Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((card) => (
                      <tr key={card.controlNumber} className="border-b border-gray-800 hover:bg-[#2a2a2a]">
                        <td className="py-3 font-mono text-[#1A535C] font-medium">{card.controlNumber}</td>
                        <td className="py-3 text-gray-300">{card.fullName}</td>
                        <td className="py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(card.status)}`}>
                            {card.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300">{card.clinicName}</td>
                        <td className="py-3 text-gray-300">{card.type}</td>
                        <td className="py-3 text-gray-300">{card.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* App Selector Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">MOCARDS CLOUD Dashboard</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
          {/* Generator */}
          <button
            onClick={() => setActiveApp(activeApp === 'generator' ? null : 'generator')}
            className={`p-8 rounded-[32px] text-center transition-all hover:scale-105 ${
              activeApp === 'generator' ? 'bg-emerald-500 text-white shadow-2xl' : 'bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Plus className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-bold text-lg">Generator</h3>
            <p className="text-sm opacity-80">Create Cards</p>
          </button>

          {/* Activate */}
          <button
            onClick={() => setActiveApp(activeApp === 'activate' ? null : 'activate')}
            className={`p-8 rounded-[32px] text-center transition-all hover:scale-105 ${
              activeApp === 'activate' ? 'bg-[#1A535C] text-white shadow-2xl' : 'bg-white border-2 border-teal-200 text-teal-700 hover:bg-teal-50'
            }`}
          >
            <CheckCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-bold text-lg">Activate</h3>
            <p className="text-sm opacity-80">Manage Status</p>
          </button>

          {/* MOCARDS Database */}
          <button
            onClick={() => setActiveApp(activeApp === 'mocards' ? null : 'mocards')}
            className={`p-8 rounded-[32px] text-center transition-all hover:scale-105 ${
              activeApp === 'mocards' ? 'bg-purple-500 text-white shadow-2xl' : 'bg-white border-2 border-purple-200 text-purple-700 hover:bg-purple-50'
            }`}
          >
            <Database className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-bold text-lg">MOCARDS</h3>
            <p className="text-sm opacity-80">Database View</p>
          </button>

          {/* Clinics */}
          <button
            onClick={() => setActiveApp(activeApp === 'clinics' ? null : 'clinics')}
            className={`p-8 rounded-[32px] text-center transition-all hover:scale-105 ${
              activeApp === 'clinics' ? 'bg-blue-500 text-white shadow-2xl' : 'bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Building2 className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-bold text-lg">Clinics</h3>
            <p className="text-sm opacity-80">Partners</p>
          </button>

          {/* Endorse */}
          <button
            onClick={() => setActiveApp(activeApp === 'endorse' ? null : 'endorse')}
            className={`p-8 rounded-[32px] text-center transition-all hover:scale-105 ${
              activeApp === 'endorse' ? 'bg-orange-500 text-white shadow-2xl' : 'bg-white border-2 border-orange-200 text-orange-700 hover:bg-orange-50'
            }`}
          >
            <UserCheck className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-bold text-lg">Endorse</h3>
            <p className="text-sm opacity-80">Assign Cards</p>
          </button>

          {/* Calendar */}
          <button
            onClick={() => setActiveApp(activeApp === 'calendar' ? null : 'calendar')}
            className={`p-8 rounded-[32px] text-center transition-all hover:scale-105 col-span-2 md:col-span-3 lg:col-span-5 ${
              activeApp === 'calendar' ? 'bg-indigo-500 text-white shadow-2xl' : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <Calendar className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-bold text-lg">Calendar</h3>
            <p className="text-sm opacity-80">Appointments</p>
          </button>
        </div>

        {/* Module Content */}
        {activeApp && (
          <div className="bg-white rounded-[32px] border-2 border-gray-100 p-8 shadow-lg">
            {/* Generator Module */}
            {activeApp === 'generator' && (
              <div className="space-y-6">
                <div className="flex items-center mb-6">
                  <Plus className="h-8 w-8 text-emerald-500 mr-3" />
                  <h3 className="text-2xl font-bold">Card Generator</h3>
                </div>

                {/* Mode Selection */}
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setGeneratorForm(prev => ({ ...prev, mode: 'single' }))}
                    className={`px-4 py-2 rounded-xl border-2 ${
                      generatorForm.mode === 'single'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    Single Card
                  </button>
                  <button
                    onClick={() => setGeneratorForm(prev => ({ ...prev, mode: 'batch' }))}
                    className={`px-4 py-2 rounded-xl border-2 ${
                      generatorForm.mode === 'batch'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    Batch Generation
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Single Card Form */}
                  {generatorForm.mode === 'single' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={generatorForm.fullName}
                          onChange={(e) => setGeneratorForm(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                          placeholder="Enter patient name"
                        />
                      </div>
                    </div>
                  )}

                  {/* Batch Form */}
                  {generatorForm.mode === 'batch' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start ID</label>
                          <input
                            type="number"
                            value={generatorForm.idStart}
                            onChange={(e) => setGeneratorForm(prev => ({ ...prev, idStart: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End ID</label>
                          <input
                            type="number"
                            value={generatorForm.idEnd}
                            onChange={(e) => setGeneratorForm(prev => ({ ...prev, idEnd: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                            placeholder="100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Common Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                      <select
                        value={generatorForm.region}
                        onChange={(e) => setGeneratorForm(prev => ({ ...prev, region: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      >
                        <option value="">Select Region</option>
                        {REGIONS.map(region => (
                          <option key={region.code} value={region.code}>{region.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Area Code</label>
                      <select
                        value={generatorForm.areaCode}
                        onChange={(e) => setGeneratorForm(prev => ({ ...prev, areaCode: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      >
                        <option value="">Select Area Code</option>
                        {AREA_CODES.map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Custom Area Code</label>
                      <input
                        type="text"
                        value={generatorForm.customAreaCode}
                        onChange={(e) => setGeneratorForm(prev => ({ ...prev, customAreaCode: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                        placeholder="Enter custom code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                      <select
                        value={generatorForm.type}
                        onChange={(e) => setGeneratorForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      >
                        <option value="Premium">Premium</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Diamond">Diamond</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateCards}
                  className="w-full bg-emerald-500 text-white py-3 px-6 rounded-xl hover:bg-emerald-600 transition-colors font-medium"
                >
                  Generate {generatorForm.mode === 'single' ? 'Card' : 'Batch'}
                </button>
              </div>
            )}

            {/* Activate Module */}
            {activeApp === 'activate' && (
              <div className="space-y-6">
                <div className="flex items-center mb-6">
                  <CheckCircle className="h-8 w-8 text-[#1A535C] mr-3" />
                  <h3 className="text-2xl font-bold">Card Activation</h3>
                </div>

                <div className="max-w-md mx-auto">
                  <div className="flex space-x-4 mb-6">
                    <input
                      type="text"
                      value={activateForm.searchQuery}
                      onChange={(e) => setActivateForm(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                      placeholder="Enter Control Number"
                    />
                    <button
                      onClick={handleSearchCard}
                      className="bg-[#1A535C] text-white px-6 py-2 rounded-xl hover:bg-teal-700 transition-colors"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </div>

                  {activateForm.selectedCard && (
                    <div className="bg-gray-50 rounded-[32px] p-6 text-center">
                      <CreditCard className="h-16 w-16 mx-auto mb-4 text-[#1A535C]" />
                      <h4 className="text-xl font-bold mb-2">{activateForm.selectedCard.fullName}</h4>
                      <p className="text-gray-600 font-mono mb-4">{activateForm.selectedCard.controlNumber}</p>
                      <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusBadgeColor(activateForm.selectedCard.status)} mb-6`}>
                        {activateForm.selectedCard.status.toUpperCase()}
                      </div>
                      <br />
                      <button
                        onClick={handleToggleCardStatus}
                        className={`px-8 py-3 rounded-xl font-medium transition-colors ${
                          activateForm.selectedCard.status === 'active'
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {activateForm.selectedCard.status === 'active' ? 'Deactivate' : 'Activate'} Card
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MOCARDS Database Module */}
            {activeApp === 'mocards' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Database className="h-8 w-8 text-purple-500 mr-3" />
                    <h3 className="text-2xl font-bold">MOCARDS Database</h3>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Cards: {cards.length}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-gray-700 font-medium">Control Number</th>
                        <th className="text-left py-3 text-gray-700 font-medium">Name</th>
                        <th className="text-left py-3 text-gray-700 font-medium">Status</th>
                        <th className="text-left py-3 text-gray-700 font-medium">Clinic</th>
                        <th className="text-left py-3 text-gray-700 font-medium">Perks</th>
                        <th className="text-left py-3 text-gray-700 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cards.map((card) => (
                        <tr key={card.controlNumber} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-mono text-[#1A535C] font-medium">{card.controlNumber}</td>
                          <td className="py-3">{card.fullName}</td>
                          <td className="py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(card.status)}`}>
                              {card.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3">{card.clinicName}</td>
                          <td className="py-3">
                            <span className="text-sm">
                              {card.perksUsed}/{card.perksTotal}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => openPerksDialog(card)}
                              className="text-purple-500 hover:text-purple-700 text-sm font-medium"
                            >
                              Manage Perks
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Clinics Module */}
            {activeApp === 'clinics' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-blue-500 mr-3" />
                    <h3 className="text-2xl font-bold">Clinic Partners</h3>
                  </div>
                  <button
                    onClick={() => { setDialogType('clinic'); setShowDialog(true); }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Clinic
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clinics.map((clinic) => (
                    <div key={clinic.id} className="bg-white border border-gray-200 rounded-[32px] p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-lg">{clinic.name}</h4>
                          <p className="text-gray-600 text-sm">{clinic.region}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          clinic.plan === 'starter' ? 'bg-gray-100 text-gray-700' :
                          clinic.plan === 'growth' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {clinic.plan.toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <p className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {clinic.address}
                        </p>
                        <p className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Code: {clinic.code}
                        </p>
                        <p className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Cards: {clinicOperations.getCardCount(clinic.id)}/{PLAN_LIMITS[clinic.plan]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Endorse Module */}
            {activeApp === 'endorse' && (
              <div className="space-y-6">
                <div className="flex items-center mb-6">
                  <UserCheck className="h-8 w-8 text-orange-500 mr-3" />
                  <h3 className="text-2xl font-bold">Endorse Cards</h3>
                </div>

                <div className="max-w-md mx-auto">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Card Control Number</label>
                      <input
                        type="text"
                        value={endorseForm.cardControlNumber}
                        onChange={(e) => setEndorseForm(prev => ({ ...prev, cardControlNumber: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="MOC-00001-01-CVT001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Clinic</label>
                      <select
                        value={endorseForm.clinicId}
                        onChange={(e) => setEndorseForm(prev => ({ ...prev, clinicId: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select Clinic</option>
                        {clinics.map(clinic => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.name} ({clinicOperations.getCardCount(clinic.id)}/{PLAN_LIMITS[clinic.plan]})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleEndorseCard}
                      className="w-full bg-orange-500 text-white py-3 px-6 rounded-xl hover:bg-orange-600 transition-colors font-medium"
                    >
                      Endorse Card
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Module */}
            {activeApp === 'calendar' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-indigo-500 mr-3" />
                    <h3 className="text-2xl font-bold">Appointment Calendar</h3>
                  </div>
                  <button
                    onClick={() => { setDialogType('appointment'); setShowDialog(true); }}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </button>
                </div>

                <div className="grid gap-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="bg-white border border-gray-200 rounded-[32px] p-6 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">{appointment.patientName}</h4>
                        <p className="text-gray-600 text-sm font-mono">{appointment.cardControlNumber}</p>
                        <p className="text-gray-600 text-sm">
                          {clinics.find(c => c.id === appointment.clinicId)?.name}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-medium">{appointment.date}</p>
                        <p className="text-gray-600">{appointment.time}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(appointment.status)}`}>
                          {appointment.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {dialogType === 'clinic' && 'Add New Clinic'}
                {dialogType === 'appointment' && 'Schedule Appointment'}
                {dialogType === 'perks' && 'Manage Perks'}
              </h3>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Clinic Dialog */}
            {dialogType === 'clinic' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Clinic Name"
                  value={clinicForm.name}
                  onChange={(e) => setClinicForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Region"
                  value={clinicForm.region}
                  onChange={(e) => setClinicForm(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Clinic Code"
                  value={clinicForm.code}
                  onChange={(e) => setClinicForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <select
                  value={clinicForm.plan}
                  onChange={(e) => setClinicForm(prev => ({ ...prev, plan: e.target.value as ClinicPlan }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                >
                  <option value="starter">Starter (500 cards)</option>
                  <option value="growth">Growth (1000 cards)</option>
                  <option value="pro">Pro (2000 cards)</option>
                </select>

                <input
                  type="text"
                  placeholder="Address"
                  value={clinicForm.address}
                  onChange={(e) => setClinicForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <button
                  onClick={handleCreateClinic}
                  className="w-full bg-[#1A535C] text-white py-3 px-6 rounded-xl hover:bg-teal-700 transition-colors font-medium"
                >
                  Create Clinic
                </button>
              </div>
            )}

            {/* Appointment Dialog */}
            {dialogType === 'appointment' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={appointmentForm.patientName}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, patientName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Card Control Number"
                  value={appointmentForm.cardControlNumber}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, cardControlNumber: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <input
                  type="date"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                />

                <select
                  value={appointmentForm.clinicId}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, clinicId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                >
                  <option value="">Select Clinic</option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleCreateAppointment}
                  className="w-full bg-[#1A535C] text-white py-3 px-6 rounded-xl hover:bg-teal-700 transition-colors font-medium"
                >
                  Schedule Appointment
                </button>
              </div>
            )}

            {/* Perks Dialog */}
            {dialogType === 'perks' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h4 className="font-bold">{perksForm.selectedCard?.fullName}</h4>
                  <p className="text-gray-600 font-mono text-sm">{perksForm.selectedCard?.controlNumber}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Perks Used</label>
                  <input
                    type="number"
                    value={perksForm.perksUsed}
                    onChange={(e) => setPerksForm(prev => ({ ...prev, perksUsed: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Perks</label>
                  <input
                    type="number"
                    value={perksForm.perksTotal}
                    onChange={(e) => setPerksForm(prev => ({ ...prev, perksTotal: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleUpdatePerks}
                  className="w-full bg-[#1A535C] text-white py-3 px-6 rounded-xl hover:bg-teal-700 transition-colors font-medium"
                >
                  Update Perks
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}