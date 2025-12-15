import { useState, useEffect } from 'react';
import { supabase, dbOperations } from '../lib/supabase';

interface AssignedCard {
  id: string;
  control_number: string;
  unified_control_number?: string;
  display_card_number?: number;
  passcode: string;
  status: 'unactivated' | 'activated';
  activated_at?: string;
  expires_at?: string;
  batch_number: string;
  created_at: string;
}

interface Perk {
  id: string;
  perk_type: string;
  claimed: boolean;
  claimed_at?: string;
}

interface ActivationForm {
  control_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  sale_amount: number;
}

interface RedemptionForm {
  control_number: string;
  passcode: string;
  perk_type: string;
  service_provided: string;
}

interface ClinicCardManagementProps {
  clinicId: string;
  clinicName: string;
  clinicCode: string;
}

export function ClinicCardManagement({ clinicId, clinicName, clinicCode }: ClinicCardManagementProps) {
  const [assignedCards, setAssignedCards] = useState<AssignedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<AssignedCard | null>(null);
  const [cardPerks, setCardPerks] = useState<Perk[]>([]);
  const [activeTab, setActiveTab] = useState<'cards' | 'activate' | 'redeem'>('cards');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const [activationForm, setActivationForm] = useState<ActivationForm>({
    control_number: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    sale_amount: 0
  });

  const [redemptionForm, setRedemptionForm] = useState<RedemptionForm>({
    control_number: '',
    passcode: '',
    perk_type: '',
    service_provided: ''
  });

  useEffect(() => {
    loadAssignedCards();
  }, [clinicId]);

  const loadAssignedCards = async () => {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        id,
        control_number,
        passcode,
        status,
        activated_at,
        expires_at,
        created_at,
        batch:card_batches(batch_number)
      `)
      .eq('assigned_clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) {
      // Production: error logging removed
    } else {
      const formattedCards = data?.map(card => ({
        id: card.id,
        control_number: card.control_number,
        passcode: card.passcode,
        status: card.status as 'unactivated' | 'activated',
        activated_at: card.activated_at,
        expires_at: card.expires_at,
        batch_number: (card.batch as any)?.batch_number || 'Unknown',
        created_at: card.created_at
      })) || [];
      setAssignedCards(formattedCards);
    }
  };

  const loadCardPerks = async (cardId: string) => {
    const { data, error } = await supabase
      .from('card_perks')
      .select('*')
      .eq('card_id', cardId)
      .order('perk_type');

    if (error) {
      // Production: error logging removed
    } else {
      setCardPerks(data || []);
    }
  };

  const activateCard = async () => {
    if (!activationForm.control_number || !activationForm.customer_name) {
      setMessage('Please fill in control number and customer name');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Find the card
      const { data: cards, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('control_number', activationForm.control_number)
        .eq('assigned_clinic_id', clinicId)
        .eq('status', 'unactivated');

      if (cardError) throw cardError;

      if (!cards || cards.length === 0) {
        throw new Error('Card not found. Please check the control number or ensure the card is assigned to your clinic and not already activated.');
      }

      if (cards.length > 1) {
        throw new Error('Multiple cards found with the same control number. Please contact support.');
      }

      const card = cards[0];

      // Complete passcode with clinic location code
      const completePasscode = `${clinicCode}${card.passcode}`;

      // Activate the card
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error: activationError } = await supabase
        .from('cards')
        .update({
          passcode: completePasscode,
          location_code: clinicCode,
          status: 'activated',
          activated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);

      if (activationError) throw activationError;

      // Record the sale
      if (activationForm.sale_amount > 0) {
        const { error: saleError } = await supabase
          .from('clinic_sales')
          .insert({
            clinic_id: clinicId,
            card_id: card.id,
            sale_amount: activationForm.sale_amount,
            commission_amount: (activationForm.sale_amount * 10) / 100, // 10% commission
            customer_name: activationForm.customer_name,
            customer_phone: activationForm.customer_phone,
            customer_email: activationForm.customer_email,
            payment_method: 'cash',
            status: 'completed'
          });

        if (saleError) throw saleError;
      }

      // Log transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: card.id,
          transaction_type: 'activated',
          performed_by: 'clinic',
          performed_by_id: clinicId,
          details: {
            customer_name: activationForm.customer_name,
            complete_passcode: completePasscode,
            clinic_code: clinicCode
          }
        });

      setMessage(`✅ Card activated successfully! Complete passcode: ${completePasscode}`);

      // Reset form and refresh data
      setActivationForm({
        control_number: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        sale_amount: 0
      });
      loadAssignedCards();

    } catch (error) {
      // Production: error logging removed
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Activation failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const redeemPerk = async () => {
    if (!redemptionForm.control_number || !redemptionForm.passcode || !redemptionForm.perk_type) {
      setMessage('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Find the card
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('control_number', redemptionForm.control_number)
        .eq('passcode', redemptionForm.passcode)
        .eq('assigned_clinic_id', clinicId)
        .eq('status', 'activated')
        .single();

      if (cardError) throw cardError;
      if (!card) throw new Error('Card not found, incorrect passcode, or not activated');

      // Find the perk
      const { data: perk, error: perkError } = await supabase
        .from('card_perks')
        .select('*')
        .eq('card_id', card.id)
        .eq('perk_type', redemptionForm.perk_type)
        .eq('is_claimed', false)
        .single();

      if (perkError) throw perkError;
      if (!perk) throw new Error('Perk not found or already redeemed');

      // Mark perk as claimed
      const { error: claimError } = await supabase
        .from('card_perks')
        .update({
          is_claimed: true,
          claimed_at: new Date().toISOString(),
          claimed_by_clinic: clinicId
        })
        .eq('id', perk.id);

      if (claimError) throw claimError;

      // Record the redemption
      await supabase
        .from('clinic_perk_redemptions')
        .insert({
          clinic_id: clinicId,
          card_id: card.id,
          perk_id: perk.id,
          service_provided: redemptionForm.service_provided,
          service_value: 0 // You can add this to the form if needed
        });

      // Log transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: card.id,
          transaction_type: 'perk_claimed',
          performed_by: 'clinic',
          performed_by_id: clinicId,
          details: {
            perk_type: redemptionForm.perk_type,
            service_provided: redemptionForm.service_provided
          }
        });

      setMessage(`✅ Perk "${redemptionForm.perk_type}" redeemed successfully!`);

      // Reset form
      setRedemptionForm({
        control_number: '',
        passcode: '',
        perk_type: '',
        service_provided: ''
      });

    } catch (error) {
      // Production: error logging removed
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Redemption failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const viewCardDetails = async (card: AssignedCard) => {
    setSelectedCard(card);
    await loadCardPerks(card.id);
  };

  const unactivatedCards = assignedCards.filter(card => card.status === 'unactivated');
  const activatedCards = assignedCards.filter(card => card.status === 'activated');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Card Management - {clinicName}
        </h2>
        <p className="text-gray-600">
          Manage your assigned loyalty cards, activate cards for customers, and redeem perks
        </p>
        <div className="mt-4 flex space-x-4 text-sm">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Clinic Code: {clinicCode}
          </span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
            Total Cards: {assignedCards.length}
          </span>
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
            Unactivated: {unactivatedCards.length}
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            Activated: {activatedCards.length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {[
              { id: 'cards', name: 'My Cards', count: assignedCards.length },
              { id: 'activate', name: 'Activate Card', count: null },
              { id: 'redeem', name: 'Redeem Perk', count: null }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name} {tab.count !== null && `(${tab.count})`}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'cards' && (
            <div className="space-y-6">
              {/* Unactivated Cards */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Ready to Sell ({unactivatedCards.length} cards)
                </h3>
                {unactivatedCards.length === 0 ? (
                  <p className="text-gray-500">No unactivated cards available. Contact admin for card assignment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incomplete Passcode</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {unactivatedCards.map(card => (
                          <tr key={card.id}>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-600">{card.control_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-orange-600">{card.passcode}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{card.batch_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setActivationForm({ ...activationForm, control_number: card.control_number });
                                  setActiveTab('activate');
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Activate →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Activated Cards */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Active Customer Cards ({activatedCards.length} cards)
                </h3>
                {activatedCards.length === 0 ? (
                  <p className="text-gray-500">No activated cards yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complete Passcode</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activated</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {activatedCards.map(card => (
                          <tr key={card.id}>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-600">{card.control_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-green-600">{card.passcode}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {card.activated_at ? new Date(card.activated_at).toLocaleDasearchring() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {card.expires_at ? new Date(card.expires_at).toLocaleDasearchring() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => viewCardDetails(card)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                View Perks
                              </button>
                              <button
                                onClick={() => {
                                  setRedemptionForm({ ...redemptionForm, control_number: card.control_number, passcode: card.passcode });
                                  setActiveTab('redeem');
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Redeem →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activate' && (
            <div className="max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Activate Card for Customer
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Control Number</label>
                <input
                  type="text"
                  value={activationForm.control_number}
                  onChange={(e) => setActivationForm({ ...activationForm, control_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="MOC-12345678-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={activationForm.customer_name}
                  onChange={(e) => setActivationForm({ ...activationForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Juan Dela Cruz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={activationForm.customer_phone}
                  onChange={(e) => setActivationForm({ ...activationForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="09171234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  value={activationForm.customer_email}
                  onChange={(e) => setActivationForm({ ...activationForm, customer_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Amount (₱)</label>
                <input
                  type="number"
                  value={activationForm.sale_amount}
                  onChange={(e) => setActivationForm({ ...activationForm, sale_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                />
              </div>

              <button
                onClick={activateCard}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Activating...' : `Activate Card (Passcode: ${clinicCode}XXXX)`}
              </button>

              {message && (
                <div className={`p-3 rounded-md ${message.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'redeem' && (
            <div className="max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Redeem Customer Perk
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Control Number</label>
                <input
                  type="text"
                  value={redemptionForm.control_number}
                  onChange={(e) => setRedemptionForm({ ...redemptionForm, control_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="MOC-12345678-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complete Passcode</label>
                <input
                  type="text"
                  value={redemptionForm.passcode}
                  onChange={(e) => setRedemptionForm({ ...redemptionForm, passcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={`${clinicCode}1234`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perk to Redeem</label>
                <select
                  value={redemptionForm.perk_type}
                  onChange={(e) => setRedemptionForm({ ...redemptionForm, perk_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select perk...</option>
                  <option value="consultation">Free Consultation</option>
                  <option value="cleaning">Teeth Cleaning</option>
                  <option value="extraction">Tooth Extraction</option>
                  <option value="fluoride">Fluoride Treatment</option>
                  <option value="whitening">Teeth Whitening</option>
                  <option value="xray">X-Ray</option>
                  <option value="denture">Denture Adjustment</option>
                  <option value="braces">Braces Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Provided</label>
                <input
                  type="text"
                  value={redemptionForm.service_provided}
                  onChange={(e) => setRedemptionForm({ ...redemptionForm, service_provided: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Describe the service provided..."
                />
              </div>

              <button
                onClick={redeemPerk}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Redeem Perk'}
              </button>

              {message && (
                <div className={`p-3 rounded-md ${message.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Card Details</h3>
            <div className="space-y-3">
              <p><strong>Control:</strong> {selectedCard.control_number}</p>
              <p><strong>Passcode:</strong> {selectedCard.passcode}</p>
              <p><strong>Status:</strong> {selectedCard.status}</p>

              <h4 className="font-medium mt-4">Perks:</h4>
              <div className="space-y-2">
                {cardPerks.map(perk => (
                  <div key={perk.id} className={`p-2 rounded text-sm ${perk.claimed ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {perk.claimed ? '❌' : '✅'} {perk.perk_type}
                    {perk.claimed && ` (Used: ${new Date(perk.claimed_at!).toLocaleDasearchring()})`}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelectedCard(null)}
              className="mt-4 w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}