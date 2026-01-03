import { useState, useEffect } from 'react';
import { useLegacyAuth } from '../../features/authentication';
import {
  Shield, Users, CreditCard, Calendar, Settings, LogIn,
  Plus, Send
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

interface Clinic {
  id: string;
  name: string;
  code: string;
}

export function SimpleAdminPortalView() {
  const { isAuthenticated, login, logout } = useLegacyAuth();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState('cards');

  // Cards State
  const [cards, setCards] = useState<Card[]>([]);
  const [newCardForm, setNewCardForm] = useState({
    quantity: 1,
    region: '4A',
    areaCode: 'CVT001'
  });

  // Clinics State
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedClinic, setSelectedClinic] = useState('');

  // Appointment State
  const [appointmentForm, setAppointmentForm] = useState({
    clinicId: '',
    cardControlNumber: '',
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    preferredDate: '',
    preferredTime: '',
    serviceType: '',
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

  const handleGenerateCards = async () => {
    try {
      const newCards = await cardOperations.generateCards(
        newCardForm.quantity,
        newCardForm.region,
        newCardForm.areaCode
      );
      setCards([...cards, ...newCards]);
      addToast(toastSuccess('Cards Generated', `Successfully generated ${newCards.length} cards`));
      setNewCardForm({ quantity: 1, region: '4A', areaCode: 'CVT001' });
    } catch (error) {
      addToast(toastError('Generation Failed', 'Failed to generate cards'));
    }
  };

  const handleAssignCards = async () => {
    if (selectedCards.length === 0 || !selectedClinic) {
      addToast(toastWarning('Assignment Error', 'Please select cards and a clinic'));
      return;
    }

    try {
      const success = await cardOperations.assignToClinic(selectedCards, selectedClinic);
      if (success) {
        addToast(toastSuccess('Cards Assigned', `Assigned ${selectedCards.length} cards to clinic`));
        setSelectedCards([]);
        setSelectedClinic('');
        loadData();
      } else {
        addToast(toastError('Assignment Failed', 'Failed to assign cards to clinic'));
      }
    } catch (error) {
      addToast(toastError('Assignment Error', 'Error assigning cards'));
    }
  };

  const handleSendAppointment = async () => {
    if (!appointmentForm.clinicId || !appointmentForm.patientName) {
      addToast(toastWarning('Missing Info', 'Please fill in required fields'));
      return;
    }

    try {
      await appointmentOperations.create({
        ...appointmentForm,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      addToast(toastSuccess('Appointment Sent', 'Appointment request sent to clinic'));
      setAppointmentForm({
        clinicId: '',
        cardControlNumber: '',
        patientName: '',
        patientEmail: '',
        patientPhone: '',
        preferredDate: '',
        preferredTime: '',
        serviceType: '',
        notes: ''
      });
    } catch (error) {
      addToast(toastError('Send Failed', 'Failed to send appointment request'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h1>
            <p className="text-gray-600">Please authenticate with your admin credentials</p>
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
    { id: 'appointments', name: 'Send Appointments', icon: Calendar }
  ];

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
                <p className="text-sm text-gray-600">System Administration</p>
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

      {/* Navigation */}
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

      {/* Card Management Tab */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          {/* Generate Cards */}
          <div className="light-card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Generate Cards
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
                <Users className="h-5 w-5 mr-2" />
                Assign Cards to Clinic
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Clinic</label>
                  <select
                    value={selectedClinic}
                    onChange={(e) => setSelectedClinic(e.target.value)}
                    className="light-select"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cards Selected</label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {selectedCards.length} cards selected
                  </div>
                </div>
              </div>
              <button
                onClick={handleAssignCards}
                disabled={selectedCards.length === 0 || !selectedClinic}
                className="light-button-primary disabled:opacity-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Assign Selected Cards
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="light-card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Cards ({cards.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cards.filter(card => !card.clinicId).map(card => (
                  <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg">
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
            </div>
          </div>
        </div>
      )}

      {/* Appointment Management Tab */}
      {activeTab === 'appointments' && (
        <div className="light-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Send Appointment Request to Clinic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value="">Select service...</option>
                  <option value="Dental Cleaning">Dental Cleaning</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Check-up">Check-up</option>
                  <option value="Treatment">Treatment</option>
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
                  placeholder="Additional notes for the clinic..."
                />
              </div>
            </div>
            <div className="mt-6">
              <button onClick={handleSendAppointment} className="light-button-primary">
                <Send className="h-4 w-4 mr-2" />
                Send Appointment Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}