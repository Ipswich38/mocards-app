import { useState, useEffect } from 'react';
import { useLegacyAuth } from '../../features/authentication';
import {
  Shield, CreditCard, Building2, Calendar, Settings, LogIn,
  Plus, Users, Send, Edit, Trash2
} from 'lucide-react';
import { cardOperations, clinicOperations, appointmentOperations } from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

interface Card {
  id: string;
  controlNumber: string;
  fullName: string;
  status: 'active' | 'inactive';
  clinicId: string;
  expiryDate: string;
}

// Using any type for simplicity to avoid type conflicts

export function StreamlinedAdminPortalView() {
  const { isAuthenticated, login, logout } = useLegacyAuth();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState('cards');

  // Cards State
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [newCardForm, setNewCardForm] = useState({
    quantity: 100,
    region: '4A',
    areaCode: 'CVT001'
  });

  // Clinics State
  const [clinics, setClinics] = useState<any[]>([]);
  const [newClinicForm, setNewClinicForm] = useState({
    name: '',
    code: '',
    region: '4A',
    address: '',
    phone: '',
    email: ''
  });

  // Appointments State
  const [appointmentForm, setAppointmentForm] = useState({
    clinicId: '',
    cardControlNumber: '',
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    preferredDate: '',
    preferredTime: '',
    serviceType: 'General Checkup',
    notes: ''
  });

  const { addToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [cardsData, clinicsData] = await Promise.all([
        cardOperations.getAll(),
        clinicOperations.getAll()
      ]);
      setCards(cardsData);
      setClinics(clinicsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      login('admin', { id: 'admin', username: 'admin', type: 'admin' });
      addToast(toastSuccess('Welcome', 'Logged in as Administrator'));
    } else {
      addToast(toastError('Login Failed', 'Invalid admin credentials'));
    }
  };

  // Card Operations
  const handleGenerateCards = async () => {
    try {
      const newCards = await cardOperations.generateCards(
        newCardForm.quantity,
        newCardForm.region,
        newCardForm.areaCode,
        5 // perks per card
      );
      setCards([...cards, ...newCards]);
      addToast(toastSuccess('Cards Generated', `Successfully generated ${newCards.length} cards`));
      setNewCardForm({ quantity: 100, region: '4A', areaCode: 'CVT001' });
      loadData(); // Refresh data
    } catch (error) {
      addToast(toastError('Generation Failed', 'Failed to generate cards'));
      console.error('Card generation error:', error);
    }
  };

  const handleAssignCards = async (clinicId: string) => {
    if (selectedCards.length === 0) {
      addToast(toastWarning('No Cards Selected', 'Please select cards to assign'));
      return;
    }

    try {
      const success = await cardOperations.assignToClinic(selectedCards, clinicId);
      if (success) {
        addToast(toastSuccess('Cards Assigned', `Assigned ${selectedCards.length} cards to clinic`));
        setSelectedCards([]);
        loadData();
      } else {
        addToast(toastError('Assignment Failed', 'Failed to assign cards to clinic'));
      }
    } catch (error) {
      addToast(toastError('Assignment Error', 'Error assigning cards'));
    }
  };

  // Clinic Operations
  const handleCreateClinic = async () => {
    if (!newClinicForm.name || !newClinicForm.code) {
      addToast(toastWarning('Missing Information', 'Please fill in clinic name and code'));
      return;
    }

    try {
      const clinic = await clinicOperations.create({
        ...newClinicForm,
        username: newClinicForm.code.toLowerCase(),
        plan: 'starter',
        subscriptionPrice: 999,
        password: 'clinic123' // Default password
      });
      setClinics([...clinics, clinic]);
      addToast(toastSuccess('Clinic Created', 'New clinic created successfully'));
      setNewClinicForm({
        name: '',
        code: '',
        region: '4A',
        address: '',
        phone: '',
        email: ''
      });
    } catch (error) {
      addToast(toastError('Creation Failed', 'Failed to create clinic'));
    }
  };

  const handleDeleteClinic = async (clinicId: string) => {
    if (confirm('Are you sure you want to delete this clinic?')) {
      try {
        await clinicOperations.delete(clinicId);
        setClinics(clinics.filter(c => c.id !== clinicId));
        addToast(toastSuccess('Clinic Deleted', 'Clinic deleted successfully'));
      } catch (error) {
        addToast(toastError('Delete Failed', 'Failed to delete clinic'));
      }
    }
  };

  // Appointment Operations
  const handleSendAppointment = async () => {
    if (!appointmentForm.clinicId || !appointmentForm.patientName) {
      addToast(toastWarning('Missing Information', 'Please fill in clinic and patient name'));
      return;
    }

    try {
      await appointmentOperations.create({
        ...appointmentForm,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      addToast(toastSuccess('Appointment Sent', 'Appointment request forwarded to clinic'));
      setAppointmentForm({
        clinicId: '',
        cardControlNumber: '',
        patientName: '',
        patientEmail: '',
        patientPhone: '',
        preferredDate: '',
        preferredTime: '',
        serviceType: 'General Checkup',
        notes: ''
      });
    } catch (error) {
      addToast(toastError('Send Failed', 'Failed to send appointment request'));
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h1>
            <p className="text-gray-600">Enter admin credentials to access system</p>
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
            <button type="submit" className="light-button-primary w-full flex items-center justify-center">
              <LogIn className="h-4 w-4 mr-2" />
              Access Admin Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'cards', name: 'Manage Cards', icon: CreditCard },
    { id: 'clinics', name: 'Manage Clinics', icon: Building2 },
    { id: 'appointments', name: 'Send Appointments', icon: Calendar }
  ];

  const unassignedCards = cards.filter(card => !card.clinicId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-sm text-gray-600">System Administration Dashboard</p>
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

      {/* Navigation Tabs */}
      <div className="light-card mb-6">
        <div className="p-3">
          <div className="flex space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards Management */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          {/* Generate Cards */}
          <div className="light-card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Plus className="h-5 w-5 mr-2 text-blue-600" />
                Generate New Cards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newCardForm.quantity}
                    onChange={(e) => setNewCardForm({ ...newCardForm, quantity: parseInt(e.target.value) || 1 })}
                    className="light-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <select
                    value={newCardForm.region}
                    onChange={(e) => setNewCardForm({ ...newCardForm, region: e.target.value })}
                    className="light-select"
                  >
                    <option value="4A">Calabarzon (4A)</option>
                    <option value="NCR">National Capital Region</option>
                    <option value="03">Central Luzon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area Code</label>
                  <select
                    value={newCardForm.areaCode}
                    onChange={(e) => setNewCardForm({ ...newCardForm, areaCode: e.target.value })}
                    className="light-select"
                  >
                    <option value="CVT001">CVT001</option>
                    <option value="CVT002">CVT002</option>
                    <option value="BTG001">BTG001</option>
                  </select>
                </div>
              </div>
              <button onClick={handleGenerateCards} className="light-button-primary">
                <Plus className="h-4 w-4 mr-2" />
                Generate {newCardForm.quantity} Cards
              </button>
            </div>
          </div>

          {/* Assign Cards */}
          <div className="light-card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Assign Cards to Clinics ({selectedCards.length} selected)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Cards</label>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {selectedCards.length} of {unassignedCards.length} unassigned cards selected
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Clinic</label>
                  <div className="flex space-x-2">
                    {clinics.map(clinic => (
                      <button
                        key={clinic.id}
                        onClick={() => handleAssignCards(clinic.id)}
                        disabled={selectedCards.length === 0}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-sm"
                      >
                        {clinic.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cards List */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {unassignedCards.slice(0, 50).map(card => (
                  <div key={card.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedCards.includes(card.controlNumber)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCards([...selectedCards, card.controlNumber]);
                          } else {
                            setSelectedCards(selectedCards.filter(cn => cn !== card.controlNumber));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="font-mono text-sm">{card.controlNumber}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      card.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {card.status}
                    </span>
                  </div>
                ))}
              </div>

              {unassignedCards.length > 50 && (
                <p className="text-sm text-gray-600 mt-2">
                  Showing first 50 of {unassignedCards.length} unassigned cards
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clinics Management */}
      {activeTab === 'clinics' && (
        <div className="space-y-6">
          {/* Create New Clinic */}
          <div className="light-card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Plus className="h-5 w-5 mr-2 text-blue-600" />
                Create New Clinic
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name *</label>
                  <input
                    type="text"
                    value={newClinicForm.name}
                    onChange={(e) => setNewClinicForm({ ...newClinicForm, name: e.target.value })}
                    className="light-input"
                    placeholder="Enter clinic name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Code *</label>
                  <input
                    type="text"
                    value={newClinicForm.code}
                    onChange={(e) => setNewClinicForm({ ...newClinicForm, code: e.target.value.toUpperCase() })}
                    className="light-input"
                    placeholder="e.g., CLINIC001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <select
                    value={newClinicForm.region}
                    onChange={(e) => setNewClinicForm({ ...newClinicForm, region: e.target.value })}
                    className="light-select"
                  >
                    <option value="4A">Calabarzon (4A)</option>
                    <option value="NCR">National Capital Region</option>
                    <option value="03">Central Luzon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newClinicForm.phone}
                    onChange={(e) => setNewClinicForm({ ...newClinicForm, phone: e.target.value })}
                    className="light-input"
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newClinicForm.email}
                    onChange={(e) => setNewClinicForm({ ...newClinicForm, email: e.target.value })}
                    className="light-input"
                    placeholder="clinic@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={newClinicForm.address}
                    onChange={(e) => setNewClinicForm({ ...newClinicForm, address: e.target.value })}
                    className="light-input"
                    placeholder="Complete address"
                  />
                </div>
              </div>
              <button onClick={handleCreateClinic} className="light-button-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Clinic
              </button>
            </div>
          </div>

          {/* Clinics List */}
          <div className="light-card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                All Clinics ({clinics.length})
              </h2>
              <div className="space-y-3">
                {clinics.map(clinic => (
                  <div key={clinic.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{clinic.name}</h3>
                        <p className="text-sm text-gray-600">{clinic.code} • {clinic.region}</p>
                        <p className="text-sm text-gray-600">{clinic.address}</p>
                        <p className="text-sm text-gray-600">{clinic.phone} • {clinic.email}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => console.log('Edit clinic:', clinic.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClinic(clinic.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments Management */}
      {activeTab === 'appointments' && (
        <div className="light-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Send className="h-5 w-5 mr-2 text-green-600" />
              Forward Appointment Request to Clinic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Clinic *</label>
                <select
                  value={appointmentForm.clinicId}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, clinicId: e.target.value })}
                  className="light-select"
                  required
                >
                  <option value="">Choose a clinic...</option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name} ({clinic.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <input
                  type="text"
                  value={appointmentForm.cardControlNumber}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, cardControlNumber: e.target.value })}
                  className="light-input"
                  placeholder="MOC-12345-4A-CVT001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  value={appointmentForm.patientName}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, patientName: e.target.value })}
                  className="light-input"
                  placeholder="Enter patient name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Email</label>
                <input
                  type="email"
                  value={appointmentForm.patientEmail}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, patientEmail: e.target.value })}
                  className="light-input"
                  placeholder="patient@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Phone</label>
                <input
                  type="tel"
                  value={appointmentForm.patientPhone}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, patientPhone: e.target.value })}
                  className="light-input"
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={appointmentForm.serviceType}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, serviceType: e.target.value })}
                  className="light-select"
                >
                  <option value="General Checkup">General Checkup</option>
                  <option value="Dental Cleaning">Dental Cleaning</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Treatment">Treatment</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={appointmentForm.preferredDate}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, preferredDate: e.target.value })}
                  className="light-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                <input
                  type="time"
                  value={appointmentForm.preferredTime}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, preferredTime: e.target.value })}
                  className="light-input"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                  className="light-input"
                  rows={3}
                  placeholder="Additional notes or instructions for the clinic..."
                />
              </div>
            </div>
            <button onClick={handleSendAppointment} className="light-button-primary">
              <Send className="h-4 w-4 mr-2" />
              Send Appointment Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}