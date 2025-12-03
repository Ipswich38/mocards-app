import React, { useState, useEffect } from 'react';
import { productionOperations } from '../lib/production-operations';
import { ClinicCardManagement } from './ClinicCardManagement';
import type {
  ClinicDashboardStats,
  CardActivationData,
  PerkRedemptionData,
  ClinicSale
} from '../lib/production-types';

interface ProductionClinicDashboardProps {
  clinicId: string;
  clinicCode: string;
  clinicName: string;
  onBack: () => void;
}

export function ProductionClinicDashboard({
  clinicId,
  clinicCode,
  clinicName,
  onBack
}: ProductionClinicDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activate' | 'redeem' | 'cards' | 'enhanced' | 'sales'>('dashboard');
  const [stats, setStats] = useState<ClinicDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Card activation form
  const [activationData, setActivationData] = useState<CardActivationData>({
    control_number: '',
    passcode: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    sale_amount: 0,
    payment_method: 'cash'
  });

  // Perk redemption form
  const [redemptionData, setRedemptionData] = useState<PerkRedemptionData>({
    card_id: '',
    perk_id: '',
    service_provided: '',
    service_value: 0,
    notes: ''
  });

  const [lookupCard, setLookupCard] = useState({ control_number: '', passcode: '' });
  const [foundCard, setFoundCard] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [sales, setSales] = useState<ClinicSale[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [clinicId]);

  const loadDashboardData = async () => {
    try {
      const statsData = await productionOperations.getClinicDashboardStats(clinicId);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async () => {
    try {
      const cardsData = await productionOperations.getClinicCards(clinicId);
      setCards(cardsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load cards');
    }
  };

  const loadSales = async () => {
    try {
      const salesData = await productionOperations.getClinicSales(clinicId);
      setSales(salesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales');
    }
  };

  // Removed unused loadRedemptions function

  const handleActivateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await productionOperations.activateCardForClinic(clinicId, activationData);
      setSuccess(`Card ${activationData.control_number} activated successfully!`);
      setActivationData({
        control_number: '',
        passcode: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        sale_amount: 0,
        payment_method: 'cash'
      });
      loadDashboardData(); // Refresh stats
    } catch (err: any) {
      setError(err.message || 'Failed to activate card');
    }
  };

  const handleLookupCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFoundCard(null);

    try {
      // Import supabase directly since productionOperations doesn't export it
      const { supabase } = await import('../lib/supabase');

      const { data: card, error } = await supabase
        .from('cards')
        .select(`
          *,
          perks:card_perks(*)
        `)
        .eq('control_number', lookupCard.control_number)
        .eq('passcode', lookupCard.passcode)
        .eq('assigned_clinic_id', clinicId)
        .single();

      if (error) throw error;
      setFoundCard(card);
    } catch (err: any) {
      setError('Card not found or not assigned to your clinic');
    }
  };

  const handleRedeemPerk = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await productionOperations.redeemPerkForClinic(clinicId, redemptionData);
      setSuccess('Perk redeemed successfully!');
      setRedemptionData({
        card_id: '',
        perk_id: '',
        service_provided: '',
        service_value: 0,
        notes: ''
      });
      setFoundCard(null);
      setLookupCard({ control_number: '', passcode: '' });
      loadDashboardData(); // Refresh stats
    } catch (err: any) {
      setError(err.message || 'Failed to redeem perk');
    }
  };

  useEffect(() => {
    if (activeTab === 'cards') loadCards();
    if (activeTab === 'sales') loadSales();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <div className="mt-4 text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-50 px-4 py-2 rounded-lg"
            >
              ← Back to Login
            </button>
            <div>
              <div className="text-2xl text-gray-900 tracking-tight">{clinicName}</div>
              <div className="text-sm text-gray-500">Clinic Code: {clinicCode}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'dashboard', name: 'Dashboard' },
              { id: 'enhanced', name: 'Enhanced Cards' },
              { id: 'activate', name: 'Activate Card' },
              { id: 'redeem', name: 'Redeem Perk' },
              { id: 'cards', name: 'My Cards' },
              { id: 'sales', name: 'Sales' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl mb-6">
            {success}
            <button onClick={() => setSuccess('')} className="float-right text-green-400 hover:text-green-600">×</button>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Cards</div>
                <div className="text-3xl text-gray-900 mb-1">{stats.totalCards}</div>
                <div className="text-sm text-gray-500">Assigned to clinic</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Active Cards</div>
                <div className="text-3xl text-teal-600 mb-1">{stats.activeCards}</div>
                <div className="text-sm text-gray-500">Currently activated</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Monthly Limit</div>
                <div className="text-3xl text-orange-600 mb-1">{stats.remainingCardLimit}</div>
                <div className="text-sm text-gray-500">Cards remaining</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Monthly Revenue</div>
                <div className="text-3xl text-green-600 mb-1">₱{stats.monthlyRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-500">This month</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance This Month</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cards Activated</span>
                    <span className="font-medium">{stats.monthlyActivations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Perks Redeemed</span>
                    <span className="font-medium">{stats.monthlyPerksRedeemed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Revenue</span>
                    <span className="font-medium">₱{stats.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('activate')}
                    className="w-full bg-teal-600 text-white py-3 rounded-xl font-medium hover:bg-teal-700"
                  >
                    Activate New Card
                  </button>
                  <button
                    onClick={() => setActiveTab('redeem')}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700"
                  >
                    Redeem Card Perk
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Card Management Tab */}
        {activeTab === 'enhanced' && (
          <ClinicCardManagement
            clinicId={clinicId}
            clinicName={clinicName}
            clinicCode={clinicCode}
          />
        )}

        {/* Card Activation Tab */}
        {activeTab === 'activate' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Activate Patient Card</h2>
            <form onSubmit={handleActivateCard} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Control Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={activationData.control_number}
                    onChange={(e) => setActivationData({ ...activationData, control_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                    placeholder="MO-C000001-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Passcode *
                  </label>
                  <input
                    type="text"
                    required
                    value={activationData.passcode}
                    onChange={(e) => setActivationData({ ...activationData, passcode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={activationData.customer_name}
                    onChange={(e) => setActivationData({ ...activationData, customer_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                    placeholder="Juan Dela Cruz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    value={activationData.customer_phone}
                    onChange={(e) => setActivationData({ ...activationData, customer_phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                    placeholder="+63 915 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={activationData.customer_email}
                  onChange={(e) => setActivationData({ ...activationData, customer_email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                  placeholder="juan@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sale Amount (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activationData.sale_amount}
                    onChange={(e) => setActivationData({ ...activationData, sale_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                    placeholder="1500.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={activationData.payment_method}
                    onChange={(e) => setActivationData({ ...activationData, payment_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 text-white py-3 rounded-xl font-medium hover:bg-teal-700"
              >
                Activate Card
              </button>
            </form>
          </div>
        )}

        {/* Perk Redemption Tab */}
        {activeTab === 'redeem' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Card Lookup */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Look Up Patient Card</h2>
              <form onSubmit={handleLookupCard} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Control Number
                    </label>
                    <input
                      type="text"
                      required
                      value={lookupCard.control_number}
                      onChange={(e) => setLookupCard({ ...lookupCard, control_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      placeholder="MO-C000001-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passcode
                    </label>
                    <input
                      type="text"
                      required
                      value={lookupCard.passcode}
                      onChange={(e) => setLookupCard({ ...lookupCard, passcode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      placeholder="123456"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Look Up Card
                </button>
              </form>
            </div>

            {/* Found Card & Available Perks */}
            {foundCard && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Available Perks</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {foundCard.perks?.filter((perk: any) => !perk.claimed).map((perk: any) => (
                    <button
                      key={perk.id}
                      onClick={() => setRedemptionData({ ...redemptionData, card_id: foundCard.id, perk_id: perk.id })}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        redemptionData.perk_id === perk.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium capitalize">{perk.perk_type}</div>
                      <div className="text-sm text-gray-500">Available</div>
                    </button>
                  ))}
                </div>

                {/* Redemption Form */}
                {redemptionData.perk_id && (
                  <form onSubmit={handleRedeemPerk} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Provided
                      </label>
                      <input
                        type="text"
                        value={redemptionData.service_provided}
                        onChange={(e) => setRedemptionData({ ...redemptionData, service_provided: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Teeth Cleaning"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Value (₱)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={redemptionData.service_value}
                        onChange={(e) => setRedemptionData({ ...redemptionData, service_value: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="800.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={redemptionData.notes}
                        onChange={(e) => setRedemptionData({ ...redemptionData, notes: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        rows={3}
                        placeholder="Additional notes about the service..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700"
                    >
                      Redeem Perk
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* My Cards Tab */}
        {activeTab === 'cards' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">My Cards</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cards.map((card) => (
                    <tr key={card.id}>
                      <td className="px-6 py-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{card.control_number}</code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          card.status === 'activated'
                            ? 'bg-green-100 text-green-800'
                            : card.status === 'expired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {card.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {card.perks?.filter((p: any) => !p.claimed).length} available,{' '}
                          {card.perks?.filter((p: any) => p.claimed).length} used
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {card.activated_at ? new Date(card.activated_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Sales History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{sale.customer_name || 'Walk-in'}</div>
                        <div className="text-sm text-gray-500">{sale.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">₱{sale.sale_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-green-600">₱{sale.commission_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">{sale.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}