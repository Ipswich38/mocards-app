import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, CheckCircle, AlertCircle, CreditCard, Gift, DollarSign, User } from 'lucide-react';

interface Card {
  id: string;
  card_number: number;
  unified_control_number: string;
  status: string;
  is_activated: boolean;
  clinic_name: string;
}

interface CardPerk {
  id: string;
  perk_type: string;
  perk_value: number;
  perk_description: string;
  is_claimed: boolean;
  claimed_at: string | null;
}

export function PerkRedemption() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardPerks, setCardPerks] = useState<CardPerk[]>([]);
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);

  const [searching, setSearching] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redemption form
  const [redemptionForm, setRedemptionForm] = useState({
    patientName: '',
    notes: '',
    transactionRef: '',
    discountPercent: 0,
    satisfactionRating: 5
  });

  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState('');

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('is_active', true)
        .order('clinic_name');

      if (error) throw error;
      setClinics(data || []);
    } catch (err: any) {
      console.error('Error loading clinics:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    setSelectedCard(null);
    setCardPerks([]);
    setSelectedPerks([]);

    try {
      // Search for the card
      const { data: cards, error: searchError } = await supabase
        .from('cards')
        .select(`
          id,
          card_number,
          unified_control_number,
          status,
          is_activated,
          assigned_clinic_id,
          clinics!cards_assigned_clinic_id_fkey (
            clinic_name
          )
        `)
        .or(`card_number.eq.${searchQuery.trim()},unified_control_number.ilike.${searchQuery.trim()},control_number.ilike.${searchQuery.trim()}`)
        .eq('is_activated', true)
        .limit(1)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (!cards) {
        setError('Card not found or not activated');
        return;
      }

      const card: Card = {
        id: cards.id,
        card_number: cards.card_number,
        unified_control_number: cards.unified_control_number,
        status: cards.status,
        is_activated: cards.is_activated,
        clinic_name: (cards as any).clinics?.clinic_name || 'Unassigned'
      };

      setSelectedCard(card);

      // Load card perks
      await loadCardPerks(card.id);

    } catch (err: any) {
      setError('Error searching for card: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const loadCardPerks = async (cardId: string) => {
    try {
      const { data: perks, error } = await supabase
        .from('card_perks')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at');

      if (error) throw error;

      setCardPerks(perks || []);
    } catch (err: any) {
      console.error('Error loading card perks:', err);
      setError('Error loading card perks: ' + err.message);
    }
  };

  const handlePerkSelection = (perkId: string) => {
    setSelectedPerks(prev =>
      prev.includes(perkId)
        ? prev.filter(id => id !== perkId)
        : [...prev, perkId]
    );
  };

  const calculateTotalValue = () => {
    const selectedPerkObjects = cardPerks.filter(perk => selectedPerks.includes(perk.id) && !perk.is_claimed);
    const total = selectedPerkObjects.reduce((sum, perk) => sum + perk.perk_value, 0);
    const discount = (total * redemptionForm.discountPercent) / 100;
    return {
      originalValue: total,
      discountAmount: discount,
      finalValue: total - discount
    };
  };

  const handleRedemption = async () => {
    if (!selectedCard || selectedPerks.length === 0) {
      setError('Please select a card and at least one perk to redeem');
      return;
    }

    if (!redemptionForm.patientName.trim()) {
      setError('Please enter the patient name');
      return;
    }

    if (!selectedClinic) {
      setError('Please select a clinic');
      return;
    }

    setRedeeming(true);
    setError('');

    try {
      const { originalValue, discountAmount, finalValue } = calculateTotalValue();

      // Mark selected perks as claimed
      const { error: updateError } = await supabase
        .from('card_perks')
        .update({
          is_claimed: true,
          claimed_at: new Date().toISOString(),
          claimed_by: redemptionForm.patientName,
          claimed_at_clinic_id: selectedClinic,
          redemption_notes: redemptionForm.notes,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedPerks);

      if (updateError) throw updateError;

      // Create redemption records
      const redemptionRecords = selectedPerks.map(perkId => {
        const perk = cardPerks.find(p => p.id === perkId);
        return {
          card_id: selectedCard.id,
          perk_id: perkId,
          clinic_id: selectedClinic,
          redeemed_by_admin: 'Admin Portal',
          redeemed_by_type: 'admin',
          redemption_method: 'manual',
          original_value: perk?.perk_value || 0,
          redeemed_value: ((perk?.perk_value || 0) * (100 - redemptionForm.discountPercent)) / 100,
          discount_applied: redemptionForm.discountPercent,
          redemption_notes: redemptionForm.notes,
          transaction_reference: redemptionForm.transactionRef,
          patient_satisfaction: redemptionForm.satisfactionRating
        };
      });

      const { error: redemptionError } = await supabase
        .from('perk_redemptions')
        .insert(redemptionRecords);

      if (redemptionError) throw redemptionError;

      const selectedClinicName = clinics.find(c => c.id === selectedClinic)?.clinic_name || 'Unknown';

      setSuccess(`✅ Successfully redeemed ${selectedPerks.length} perks!

Patient: ${redemptionForm.patientName}
Clinic: ${selectedClinicName}
Original Value: ₱${originalValue.toFixed(2)}
Discount: ₱${discountAmount.toFixed(2)} (${redemptionForm.discountPercent}%)
Final Value: ₱${finalValue.toFixed(2)}`);

      // Reset form
      setSelectedPerks([]);
      setRedemptionForm({
        patientName: '',
        notes: '',
        transactionRef: '',
        discountPercent: 0,
        satisfactionRating: 5
      });
      setSelectedClinic('');

      // Reload card perks to show updated status
      await loadCardPerks(selectedCard.id);

    } catch (err: any) {
      setError('Error processing redemption: ' + err.message);
    } finally {
      setRedeeming(false);
    }
  };

  const unclaimedPerks = cardPerks.filter(perk => !perk.is_claimed);
  const claimedPerks = cardPerks.filter(perk => perk.is_claimed);
  const { originalValue, discountAmount, finalValue } = calculateTotalValue();

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="card card-hover p-6">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Perk Redemption System</h2>
        <p className="text-gray-600 text-lg">
          Redeem perks for activated MOCARDS - Admin Portal
        </p>
      </div>

      {/* Search Section */}
      <div className="card card-hover p-6">
        <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
          <Search className="h-6 w-6 mr-3 text-blue-600" />
          Find Card for Redemption
        </h3>

        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by card number or control number (e.g., 1 or MOC-10000-01-CVT001)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="btn btn-primary px-6 py-3 flex items-center disabled:opacity-50"
          >
            {searching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Search className="h-5 w-5 mr-2" />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Card Information */}
      {selectedCard && (
        <div className="card card-hover p-6">
          <h3 className="text-xl font-medium text-gray-900 mb-4 flex items-center">
            <CreditCard className="h-6 w-6 mr-3 text-blue-600" />
            Card Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Card Number</p>
              <p className="font-mono text-lg font-bold text-blue-800">#{selectedCard.card_number}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 mb-1">Control Number</p>
              <p className="font-mono text-sm font-bold text-green-800">{selectedCard.unified_control_number}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 mb-1">Assigned Clinic</p>
              <p className="font-medium text-purple-800">{selectedCard.clinic_name}</p>
            </div>
          </div>

          {/* Perks Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Perks */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Gift className="h-5 w-5 mr-2 text-green-600" />
                Available Perks ({unclaimedPerks.length})
              </h4>

              {unclaimedPerks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Gift className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No unclaimed perks available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unclaimedPerks.map((perk) => (
                    <div
                      key={perk.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPerks.includes(perk.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePerkSelection(perk.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{perk.perk_type}</p>
                          {perk.perk_description && (
                            <p className="text-sm text-gray-600">{perk.perk_description}</p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <span className="text-lg font-bold text-green-600">₱{perk.perk_value.toFixed(2)}</span>
                          <div className={`ml-3 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedPerks.includes(perk.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedPerks.includes(perk.id) && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Claimed Perks */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-gray-600" />
                Claimed Perks ({claimedPerks.length})
              </h4>

              {claimedPerks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No perks claimed yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claimedPerks.map((perk) => (
                    <div key={perk.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{perk.perk_type}</p>
                          {perk.perk_description && (
                            <p className="text-sm text-gray-600">{perk.perk_description}</p>
                          )}
                          {perk.claimed_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Claimed: {new Date(perk.claimed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className="text-lg font-bold text-gray-500">₱{perk.perk_value.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Redemption Form */}
      {selectedCard && selectedPerks.length > 0 && (
        <div className="card card-hover p-6">
          <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
            <DollarSign className="h-6 w-6 mr-3 text-green-600" />
            Process Redemption
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Redemption Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Patient Name *
                </label>
                <input
                  type="text"
                  value={redemptionForm.patientName}
                  onChange={(e) => setRedemptionForm({...redemptionForm, patientName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter patient's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic *
                </label>
                <select
                  value={selectedClinic}
                  onChange={(e) => setSelectedClinic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select clinic</option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.clinic_name} ({clinic.clinic_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={redemptionForm.discountPercent}
                  onChange={(e) => setRedemptionForm({...redemptionForm, discountPercent: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={redemptionForm.transactionRef}
                  onChange={(e) => setRedemptionForm({...redemptionForm, transactionRef: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional transaction reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={redemptionForm.notes}
                  onChange={(e) => setRedemptionForm({...redemptionForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional notes about the redemption"
                />
              </div>
            </div>

            {/* Redemption Summary */}
            <div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Redemption Summary</h4>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selected Perks:</span>
                    <span className="font-medium">{selectedPerks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Value:</span>
                    <span className="font-medium">₱{originalValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount ({redemptionForm.discountPercent}%):</span>
                    <span className="font-medium text-red-600">-₱{discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Final Value:</span>
                      <span className="text-lg font-bold text-green-600">₱{finalValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRedemption}
                  disabled={redeeming || !redemptionForm.patientName.trim() || !selectedClinic}
                  className="w-full mt-6 btn bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-bold uppercase tracking-wider flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {redeeming ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-3" />
                      Redeem Perks
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center">
          <AlertCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-center">
          <CheckCircle className="h-6 w-6 mr-3" />
          <pre className="text-lg whitespace-pre-line">{success}</pre>
        </div>
      )}

      {/* Information */}
      <div className="card p-6">
        <div className="border border-blue-200 p-6 rounded-lg bg-blue-50">
          <h4 className="text-lg font-medium text-blue-700 mb-4 flex items-center">
            <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Perk Redemption Works:
          </h4>
          <ul className="text-gray-700 space-y-2 text-base">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Search for activated cards using card number or control number
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Select unclaimed perks that the patient wants to redeem
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Enter patient details and select the clinic processing the redemption
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Apply discounts if applicable and add transaction notes
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Process redemption to mark perks as claimed and create audit trail
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}