import { useState, useEffect } from 'react';
import {
  streamlinedOps,
  Card,
  Appointment,
  ClinicMessage,
} from '../lib/streamlined-operations';
import {
  Bell,
  Calendar,
  CreditCard,
  MessageSquare,
  LogOut,
  Check,
  X,
  Eye,
  Search,
  Send,
  Gift,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Package,
} from 'lucide-react';

interface EnhancedClinicDashboardProps {
  clinicCredentials: {
    clinicId: string;
    clinicCode: string;
    clinicName: string;
    token: string;
  };
  onBack: () => void;
}

export function EnhancedClinicDashboard({ clinicCredentials, onBack }: EnhancedClinicDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'cards' | 'messages'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicCards, setClinicCards] = useState<Card[]>([]);
  const [messages, setMessages] = useState<ClinicMessage[]>([]);
  const [notifications, setNotifications] = useState<number>(0);

  // Modal states
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureAction, setSignatureAction] = useState<'activate' | 'redeem'>('activate');
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Search and form states
  const [searchControl, setSearchControl] = useState('');
  const [foundCard, setFoundCard] = useState<Card | null>(null);
  const [staffName, setStaffName] = useState('');
  const [signature, setSignature] = useState('');
  const [notes, setNotes] = useState('');

  // Message form
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    message_type: 'general' as const,
  });

  // Stats
  const [stats, setStats] = useState({
    assignedCards: 0,
    activatedCards: 0,
    pendingAppointments: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [appointmentsData, cardsData, messagesData] = await Promise.all([
        (streamlinedOps as any).getClinicAppointments(clinicCredentials.clinicId),
        (streamlinedOps as any).getClinicCards(clinicCredentials.clinicId),
        (streamlinedOps as any).getClinicMessages(clinicCredentials.clinicId),
      ]);

      setAppointments(appointmentsData);
      setClinicCards(cardsData);
      setMessages(messagesData);

      // Calculate stats
      const assignedCards = cardsData.filter((card: any) => card.status === 'assigned').length;
      const activatedCards = cardsData.filter((card: any) => card.status === 'activated').length;
      const pendingAppointments = appointmentsData.filter((apt: any) => apt.status === 'pending').length;
      const unreadMessages = messagesData.filter((msg: any) => msg.status === 'unread').length;

      setStats({
        assignedCards,
        activatedCards,
        pendingAppointments,
        unreadMessages,
      });

      setNotifications(pendingAppointments + unreadMessages);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSearch = async () => {
    if (!searchControl.trim()) {
      setError('Please enter a control number');
      return;
    }

    setLoading(true);
    setError('');
    setFoundCard(null);

    try {
      const card = await (streamlinedOps as any).lookupCard(searchControl);
      if (card && card.clinic_id === clinicCredentials.clinicId) {
        setFoundCard(card);
      } else {
        setError('Card not found or not assigned to this clinic');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find card');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentResponse = async (appointmentId: string, status: 'confirmed' | 'declined', response?: string) => {
    setLoading(true);
    setError('');

    try {
      await (streamlinedOps as any).updateAppointmentStatus(appointmentId, status, staffName, response);
      setSuccess(`Appointment ${status} successfully`);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment');
    } finally {
      setLoading(false);
    }
  };

  const openSignatureModal = (action: 'activate' | 'redeem', perkId?: string) => {
    setSignatureAction(action);
    setSelectedPerkId(perkId || null);
    setShowSignatureModal(true);
    setStaffName('');
    setSignature('');
    setNotes('');
  };

  const handleCardActivation = async () => {
    if (!selectedCard || !staffName || !signature) {
      setError('Please provide staff name and signature');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await (streamlinedOps as any).activateCardWithSignature(
        selectedCard.id,
        clinicCredentials.clinicId,
        staffName,
        signature,
        notes
      );
      setSuccess(`Card ${selectedCard.control_number} activated successfully by ${staffName}`);
      setShowSignatureModal(false);
      setFoundCard(null);
      setSelectedCard(null);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to activate card');
    } finally {
      setLoading(false);
    }
  };

  const handlePerkRedemption = async () => {
    if (!selectedCard || !selectedPerkId || !staffName || !signature) {
      setError('Please provide staff name and signature');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await (streamlinedOps as any).redeemPerkWithSignature(
        selectedCard.id,
        selectedPerkId,
        clinicCredentials.clinicId,
        staffName,
        signature,
        notes
      );
      setSuccess(`Perk redeemed successfully by ${staffName}`);
      setShowSignatureModal(false);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to redeem perk');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await (streamlinedOps as any).createClinicMessage({
        clinic_id: clinicCredentials.clinicId,
        subject: messageForm.subject,
        message: messageForm.message,
        message_type: messageForm.message_type,
        status: 'unread',
        sent_by: staffName || 'Clinic Staff',
      });

      setSuccess('Message sent to admin successfully');
      setMessageForm({ subject: '', message: '', message_type: 'general' });
      setShowMessageModal(false);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('clinic-session');
      sessionStorage.removeItem('clinic-token');
      onBack();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'activated': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{clinicCredentials.clinicName}</h1>
              <p className="text-sm text-gray-500">Clinic Code: {clinicCredentials.clinicCode}</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-400" />
                {notifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center mb-4">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center mb-4">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: Package },
              { key: 'appointments', label: 'Appointments', icon: Calendar },
              { key: 'cards', label: 'Card Management', icon: CreditCard },
              { key: 'messages', label: 'Messages', icon: MessageSquare },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {key === 'appointments' && stats.pendingAppointments > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {stats.pendingAppointments}
                  </span>
                )}
                {key === 'messages' && stats.unreadMessages > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                    {stats.unreadMessages}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Assigned Cards</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.assignedCards}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Activated Cards</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activatedCards}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingAppointments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.unreadMessages}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('cards')}
                  className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="h-6 w-6 mr-3 text-blue-600" />
                  <span className="font-medium">Manage Cards</span>
                </button>

                <button
                  onClick={() => setActiveTab('appointments')}
                  className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="h-6 w-6 mr-3 text-green-600" />
                  <span className="font-medium">View Appointments</span>
                </button>

                <button
                  onClick={() => setShowMessageModal(true)}
                  className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="h-6 w-6 mr-3 text-purple-600" />
                  <span className="font-medium">Message Admin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Appointment Requests</h3>
                <button
                  onClick={loadDashboardData}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No appointment requests
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patient_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.patient_phone}
                            </div>
                            {appointment.patient_email && (
                              <div className="text-sm text-gray-500">
                                {appointment.patient_email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(appointment.appointment_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.appointment_time}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.service_type}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {appointment.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAppointmentResponse(appointment.id, 'confirmed', 'We will contact you shortly to confirm the appointment details.')}
                                className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Confirm
                              </button>
                              <button
                                onClick={() => handleAppointmentResponse(appointment.id, 'declined', 'Unfortunately we cannot accommodate this appointment request.')}
                                className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Decline
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            {/* Card Search */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Card Lookup</h3>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Enter control number..."
                    value={searchControl}
                    onChange={(e) => setSearchControl(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleCardSearch}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </button>
              </div>

              {/* Found Card Display */}
              {foundCard && (
                <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">Card Details</h4>
                      <p className="text-sm text-gray-600 mt-1">Control: {foundCard.control_number}</p>
                      <p className="text-sm text-gray-600">Passcode: {foundCard.passcode}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${getStatusColor(foundCard.status)}`}>
                        {foundCard.status}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {foundCard.status === 'assigned' && (
                        <button
                          onClick={() => {
                            setSelectedCard(foundCard);
                            openSignatureModal('activate');
                          }}
                          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCard(foundCard);
                          setShowCardDetails(true);
                        }}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Perks for activated cards */}
                  {foundCard.status === 'activated' && (foundCard as any).perks && (foundCard as any).perks.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h5 className="font-medium text-gray-900 mb-2">Available Perks</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(foundCard as any).perks.map((perk: any) => (
                          <div key={perk.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{perk.perk_type}</p>
                              <p className="text-xs text-gray-600">Value: ${perk.perk_value}</p>
                            </div>
                            {!perk.claimed && (
                              <button
                                onClick={() => {
                                  setSelectedCard(foundCard);
                                  openSignatureModal('redeem', perk.id);
                                }}
                                className="flex items-center px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                              >
                                <Gift className="h-3 w-3 mr-1" />
                                Redeem
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* All Clinic Cards */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Clinic Cards</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Control Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clinicCards.slice(0, 10).map((card) => (
                      <tr key={card.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {card.control_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(card.status)}`}>
                            {card.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {card.assigned_at ? new Date(card.assigned_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedCard(card);
                              setShowCardDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Messages</h3>
              <button
                onClick={() => setShowMessageModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                New Message
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <div className="divide-y divide-gray-200">
                {messages.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No messages yet
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-gray-900">{message.subject}</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              message.message_type === 'inquiry' ? 'bg-blue-100 text-blue-800' :
                              message.message_type === 'issue' ? 'bg-red-100 text-red-800' :
                              message.message_type === 'request' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {message.message_type}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              message.status === 'unread' ? 'bg-red-100 text-red-800' :
                              message.status === 'read' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {message.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{message.message}</p>
                          {message.admin_response && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm font-medium text-blue-900">Admin Response:</p>
                              <p className="text-sm text-blue-800 mt-1">{message.admin_response}</p>
                              {message.admin_responded_at && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Responded: {new Date(message.admin_responded_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(message.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* E-Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {signatureAction === 'activate' ? 'Card Activation' : 'Perk Redemption'} - E-Signature Required
                </h3>
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Staff Member Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Digital Signature *
                  </label>
                  <input
                    type="text"
                    required
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="Type your signature"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Type your name or initials as your digital signature
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add any additional notes..."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    By providing your signature, you confirm that you have {signatureAction === 'activate' ? 'activated this card' : 'processed this perk redemption'} and verify the accuracy of this transaction.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={signatureAction === 'activate' ? handleCardActivation : handlePerkRedemption}
                  disabled={!staffName || !signature || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : `Confirm ${signatureAction === 'activate' ? 'Activation' : 'Redemption'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Send Message to Admin</h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Type *
                  </label>
                  <select
                    value={messageForm.message_type}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, message_type: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="inquiry">Inquiry</option>
                    <option value="request">Request</option>
                    <option value="issue">Issue/Problem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter message subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    value={messageForm.message}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={6}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your message..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowMessageModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Card Details Modal */}
      {showCardDetails && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Complete Card Details</h3>
                <button
                  onClick={() => setShowCardDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Card information display would go here */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Control Number</label>
                    <div className="bg-gray-50 p-3 rounded-lg border font-mono">
                      {selectedCard.control_number}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCard.status)}`}>
                        {selectedCard.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* More card details would be displayed here */}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCardDetails(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}