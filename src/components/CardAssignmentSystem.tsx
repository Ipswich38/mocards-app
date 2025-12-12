import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search,
  Users,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Building2,
  ArrowRight,
  Package,
  Loader2,
  Eye,
  Trash2
} from 'lucide-react';

interface Clinic {
  id: string;
  clinic_name: string;
  clinic_code: string;
  status: string;
}

interface Card {
  id: string;
  control_number: string;
  control_number_v2?: string;
  status: 'unassigned' | 'assigned' | 'activated';
  assigned_clinic_id?: string;
  created_at: string;
}

interface AssignmentBatch {
  clinic: Clinic;
  cards: Card[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export function CardAssignmentSystem() {
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [availableCards, setAvailableCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [assignmentBatches, setAssignmentBatches] = useState<AssignmentBatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadClinics();
    loadAssignmentBatches();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      loadAvailableCards();
    }
  }, [selectedClinic, cardSearchQuery]);

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('mocards_clinics')
        .select('id, clinic_name, clinic_code, status')
        .eq('status', 'active')
        .order('clinic_name');

      if (error) throw error;
      setClinics(data || []);
    } catch (err: any) {
      setError('Failed to load clinics: ' + err.message);
    }
  };

  const loadAvailableCards = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cards')
        .select(`
          id,
          control_number,
          control_number_v2,
          status,
          assigned_clinic_id,
          created_at
        `)
        .in('status', ['unassigned', 'assigned']) // Include assigned for management
        .order('created_at', { ascending: false })
        .limit(100);

      if (cardSearchQuery.trim()) {
        query = query.or(
          `control_number.ilike.%${cardSearchQuery}%,control_number_v2.ilike.%${cardSearchQuery}%`
        );
      }

      const { data: cardsData, error } = await query;
      if (error) throw error;

      setAvailableCards(cardsData || []);
    } catch (err: any) {
      setError('Failed to load cards: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentBatches = async () => {
    // For demo purposes, we'll create mock recent assignments
    // In production, this would come from an assignment_history table
    setAssignmentBatches([]);
  };

  const assignCardsToClinic = async () => {
    if (!selectedClinic || selectedCards.length === 0) {
      setError('Please select a clinic and at least one card');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create assignment batch
      const cards = availableCards.filter(card => selectedCards.includes(card.id));
      const batch: AssignmentBatch = {
        clinic: selectedClinic,
        cards,
        status: 'processing'
      };

      setAssignmentBatches(prev => [batch, ...prev]);

      // Perform the assignment
      const { error } = await supabase
        .from('cards')
        .update({
          assigned_clinic_id: selectedClinic.id,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', selectedCards)
        .select();

      if (error) throw error;

      // Log the assignment
      await supabase
        .from('card_transactions')
        .insert({
          card_id: 'bulk_assignment',
          transaction_type: 'assigned',
          performed_by: 'admin',
          performed_by_id: 'admin',
          details: {
            clinic_id: selectedClinic.id,
            clinic_name: selectedClinic.clinic_name,
            card_count: selectedCards.length,
            card_ids: selectedCards
          }
        });

      // Update batch status
      setAssignmentBatches(prev =>
        prev.map(b =>
          b === batch ? { ...b, status: 'completed' } : b
        )
      );

      setSuccess(`Successfully assigned ${selectedCards.length} cards to ${selectedClinic.clinic_name}`);
      setSelectedCards([]);
      loadAvailableCards();

    } catch (err: any) {
      // Update batch status to failed
      setAssignmentBatches(prev =>
        prev.map(b =>
          b.clinic.id === selectedClinic.id ? { ...b, status: 'failed' } : b
        )
      );
      setError('Assignment failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const selectAllUnassigned = () => {
    const unassignedCards = availableCards
      .filter(card => card.status === 'unassigned')
      .map(card => card.id);
    setSelectedCards(unassignedCards);
  };

  const clearSelection = () => {
    setSelectedCards([]);
  };

  const unassignCard = async (cardId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          assigned_clinic_id: null,
          status: 'unassigned',
          assigned_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;

      setSuccess('Card unassigned successfully');
      loadAvailableCards();
    } catch (err: any) {
      setError('Failed to unassign card: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredClinics = clinics.filter(clinic =>
    clinic.clinic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.clinic_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Card Assignment System</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('assign')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'assign'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Assign Cards
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Manage Assignments
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          {activeTab === 'assign'
            ? 'Assign unassigned cards to clinics for management and activation.'
            : 'View and manage existing card assignments across all clinics.'
          }
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clinic Selection */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Clinic</h3>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search clinics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredClinics.map(clinic => (
                <button
                  key={clinic.id}
                  onClick={() => setSelectedClinic(clinic)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedClinic?.id === clinic.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{clinic.clinic_name}</div>
                      <div className="text-sm text-gray-500">{clinic.clinic_code}</div>
                    </div>
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}

              {filteredClinics.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No clinics found</p>
                </div>
              )}
            </div>
          </div>

          {/* Card Selection */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select Cards</h3>
              {selectedClinic && (
                <div className="text-sm text-gray-500">
                  For: {selectedClinic.clinic_name}
                </div>
              )}
            </div>

            {!selectedClinic ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Select a clinic to view available cards</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search control numbers..."
                      value={cardSearchQuery}
                      onChange={(e) => setCardSearchQuery(e.target.value)}
                      className="input-field pl-10 text-sm"
                    />
                  </div>
                  <button
                    onClick={selectAllUnassigned}
                    className="btn btn-outline text-sm px-3"
                  >
                    All Unassigned
                  </button>
                  <button
                    onClick={clearSelection}
                    className="btn btn-outline text-sm px-3"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    </div>
                  ) : availableCards.length > 0 ? (
                    availableCards.map(card => (
                      <div
                        key={card.id}
                        onClick={() => {
                          if (card.status === 'unassigned') {
                            toggleCardSelection(card.id);
                          }
                        }}
                        className={`p-3 rounded-lg border transition-colors ${
                          card.status === 'unassigned'
                            ? selectedCards.includes(card.id)
                              ? 'border-blue-500 bg-blue-50 cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-sm">
                              {card.control_number_v2 || card.control_number}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                card.status === 'unassigned'
                                  ? 'bg-green-100 text-green-800'
                                  : card.status === 'assigned'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {card.status}
                              </span>
                              {card.assigned_clinic_id && (
                                <span>→ Assigned</span>
                              )}
                            </div>
                          </div>
                          {card.status === 'unassigned' && selectedCards.includes(card.id) && (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No cards found</p>
                    </div>
                  )}
                </div>

                {/* Assignment Actions */}
                {selectedCards.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {selectedCards.length} card(s) selected
                      </div>
                      <button
                        onClick={assignCardsToClinic}
                        disabled={loading}
                        className="btn btn-primary flex items-center disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Assign to {selectedClinic.clinic_name}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Assigned Cards</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search control numbers or clinics..."
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
                className="input-field pl-10 w-64"
              />
            </div>
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
                    Assigned Clinic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {availableCards
                  .filter(card => card.status === 'assigned' || card.status === 'activated')
                  .map(card => (
                    <tr key={card.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-sm text-gray-900">
                          {card.control_number_v2 || card.control_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          card.status === 'assigned'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {card.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Assigned Clinic</div>
                        <div className="text-sm text-gray-500">{card.assigned_clinic_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {card.created_at ? new Date(card.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {card.status === 'assigned' && (
                          <button
                            onClick={() => unassignCard(card.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Unassign"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {availableCards.filter(card => card.status === 'assigned' || card.status === 'activated').length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No assigned cards found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Assignment Batches */}
      {assignmentBatches.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Assignments</h3>
          <div className="space-y-3">
            {assignmentBatches.map((batch, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {batch.cards.length} cards → {batch.clinic.clinic_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {batch.clinic.clinic_code}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  batch.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : batch.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : batch.status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {batch.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}