import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Clinic {
  id: string;
  clinic_name: string;
  clinic_code: string;
  contact_email: string;
}

interface CardBatch {
  id: string;
  batch_number: string;
  total_cards: number;
  cards_generated: number;
  created_at: string;
}

interface UnassignedCard {
  id: string;
  control_number: string;
  passcode: string;
  batch_number: string;
  created_at: string;
}

export function AdminCardAssignment() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [batches, setBatches] = useState<CardBatch[]>([]);
  const [unassignedCards, setUnassignedCards] = useState<UnassignedCard[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [cardsToAssign, setCardsToAssign] = useState<number>(10);
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadClinics();
    loadBatches();
    loadUnassignedCards();
  }, []);

  const loadClinics = async () => {
    const { data, error } = await supabase
      .from('mocards_clinics')
      .select('id, clinic_name, clinic_code, contact_email')
      .eq('status', 'active')
      .order('clinic_name');

    if (error) {
      console.error('Error loading clinics:', error);
    } else {
      setClinics(data || []);
    }
  };

  const loadBatches = async () => {
    const { data, error } = await supabase
      .from('card_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading batches:', error);
    } else {
      setBatches(data || []);
    }
  };

  const loadUnassignedCards = async () => {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        id,
        control_number,
        passcode,
        created_at,
        batch:card_batches(batch_number)
      `)
      .is('assigned_clinic_id', null)
      .eq('status', 'unactivated')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading unassigned cards:', error);
    } else {
      const formattedCards = data?.map(card => ({
        id: card.id,
        control_number: card.control_number,
        passcode: card.passcode,
        batch_number: (card.batch as any)?.batch_number || 'Unknown',
        created_at: card.created_at
      })) || [];
      setUnassignedCards(formattedCards);
    }
  };

  const assignCardsToClinic = async () => {
    if (!selectedClinic || !selectedBatch) {
      setMessage('Please select both clinic and batch');
      return;
    }

    setIsAssigning(true);
    setMessage('');

    try {
      // Get unassigned cards from selected batch
      const { data: availableCards, error: cardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('batch_id', selectedBatch)
        .is('assigned_clinic_id', null)
        .eq('status', 'unactivated')
        .order('created_at')
        .limit(cardsToAssign);

      if (cardsError) throw cardsError;

      if (!availableCards || availableCards.length === 0) {
        setMessage('No unassigned cards available in selected batch');
        return;
      }

      if (availableCards.length < cardsToAssign) {
        setMessage(`Only ${availableCards.length} cards available in batch. Assigning all available cards.`);
      }

      // Assign cards to clinic
      const cardIds = availableCards.map(card => card.id);
      const { error: updateError } = await supabase
        .from('cards')
        .update({ assigned_clinic_id: selectedClinic })
        .in('id', cardIds);

      if (updateError) throw updateError;

      // Get clinic name for success message
      const clinic = clinics.find(c => c.id === selectedClinic);
      const assignedCount = availableCards.length;

      setMessage(
        `✅ Successfully assigned ${assignedCount} cards to ${clinic?.clinic_name}. Cards will now appear in their dashboard.`
      );

      // Refresh data
      loadUnassignedCards();
      loadBatches();

      // Reset form
      setSelectedClinic('');
      setSelectedBatch('');
      setCardsToAssign(10);

    } catch (error) {
      console.error('Error assigning cards:', error);
      setMessage(`❌ Error assigning cards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAssigning(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Card Assignment System
        </h2>
        <p className="text-gray-600">
          Assign generated cards to clinic partners for distribution and sales
        </p>
      </div>

      {/* Assignment Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assign Cards to Clinic
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Clinic Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Clinic Partner
              </label>
              <select
                value={selectedClinic}
                onChange={(e) => setSelectedClinic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isAssigning}
              >
                <option value="">Choose clinic...</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.clinic_name} ({clinic.clinic_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Card Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isAssigning}
              >
                <option value="">Choose batch...</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_number} ({batch.total_cards} cards)
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Cards */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cards to Assign
              </label>
              <select
                value={cardsToAssign}
                onChange={(e) => setCardsToAssign(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isAssigning}
              >
                <option value={5}>5 Cards</option>
                <option value={10}>10 Cards</option>
                <option value={25}>25 Cards</option>
                <option value={50}>50 Cards</option>
                <option value={100}>100 Cards</option>
              </select>
            </div>
          </div>

          <button
            onClick={assignCardsToClinic}
            disabled={isAssigning || !selectedClinic || !selectedBatch}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAssigning ? 'Assigning Cards...' : `Assign ${cardsToAssign} Cards to Clinic`}
          </button>

          {message && (
            <div className={`p-3 rounded-md ${message.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Clinic Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Clinic Partners Overview
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Cards
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clinics.map(clinic => (
                <tr key={clinic.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {clinic.clinic_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {clinic.clinic_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {clinic.contact_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="text-blue-600 font-medium">View Cards →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unassigned Cards Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Unassigned Cards ({unassignedCards.length} available)
        </h3>

        {unassignedCards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No unassigned cards available. Generate new cards first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Control Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incomplete Passcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {unassignedCards.slice(0, 10).map(card => (
                  <tr key={card.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                      {card.control_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-orange-600">
                      {card.passcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.batch_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(card.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unassignedCards.length > 10 && (
              <p className="text-center text-gray-500 text-sm mt-4">
                Showing first 10 of {unassignedCards.length} unassigned cards
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}