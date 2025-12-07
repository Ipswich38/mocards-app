import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, RotateCcw, AlertTriangle, Database, Plus, Edit, X } from 'lucide-react';

interface TestCard {
  id: string;
  control_number: string;
  passcode: string;
  location_code: string;
  status: string;
  assigned_clinic_id?: string;
  created_at: string;
}

interface ResetStats {
  cards_removed: number;
  clinics_removed: number;
  appointments_removed: number;
  transactions_removed: number;
  batches_removed: number;
}

export const AdminSystemReset: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetStats, setResetStats] = useState<ResetStats | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resetType, setResetType] = useState<'all' | 'test-only'>('test-only');
  const [testCards, setTestCards] = useState<TestCard[]>([]);
  const [showTestCardModal, setShowTestCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<TestCard | null>(null);
  const [newTestCard, setNewTestCard] = useState({
    control_number: '',
    passcode: '',
    location_code: 'PHL'
  });

  const loadTestCards = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .or('control_number.ilike.%TEST%,control_number.ilike.%DEMO%,control_number.ilike.%SAMPLE%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestCards(data || []);
    } catch (error) {
      console.error('Error loading test cards:', error);
    }
  };

  const createTestCard = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .insert({
          control_number: newTestCard.control_number,
          passcode: newTestCard.passcode,
          location_code: newTestCard.location_code,
          status: 'unactivated'
        })
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await supabase.from('card_transactions').insert({
        card_id: data.id,
        transaction_type: 'test_card_created',
        performed_by: 'admin',
        details: { created_via: 'admin_reset_system' }
      });

      setNewTestCard({ control_number: '', passcode: '', location_code: 'PHL' });
      await loadTestCards();
      setShowTestCardModal(false);
    } catch (error) {
      console.error('Error creating test card:', error);
      alert('Failed to create test card');
    }
  };

  const updateTestCard = async () => {
    if (!editingCard) return;

    try {
      const { error } = await supabase
        .from('cards')
        .update({
          control_number: editingCard.control_number,
          passcode: editingCard.passcode,
          location_code: editingCard.location_code,
          status: editingCard.status
        })
        .eq('id', editingCard.id);

      if (error) throw error;

      // Log the update
      await supabase.from('card_transactions').insert({
        card_id: editingCard.id,
        transaction_type: 'test_card_updated',
        performed_by: 'admin',
        details: { updated_via: 'admin_reset_system' }
      });

      setEditingCard(null);
      await loadTestCards();
    } catch (error) {
      console.error('Error updating test card:', error);
      alert('Failed to update test card');
    }
  };

  const deleteTestCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this test card?')) return;

    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;
      await loadTestCards();
    } catch (error) {
      console.error('Error deleting test card:', error);
      alert('Failed to delete test card');
    }
  };

  const performReset = async () => {
    setIsResetting(true);
    try {
      let stats: ResetStats = {
        cards_removed: 0,
        clinics_removed: 0,
        appointments_removed: 0,
        transactions_removed: 0,
        batches_removed: 0
      };

      if (resetType === 'all') {
        // Reset everything (WARNING: This removes ALL data)

        // Delete card transactions
        const { count: transactionCount } = await supabase
          .from('card_transactions')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        stats.transactions_removed = transactionCount || 0;

        // Delete appointments
        const { count: appointmentCount } = await supabase
          .from('appointments')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        stats.appointments_removed = appointmentCount || 0;

        // Delete cards
        const { count: cardCount } = await supabase
          .from('cards')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        stats.cards_removed = cardCount || 0;

        // Delete card batches
        const { count: batchCount } = await supabase
          .from('card_batches')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        stats.batches_removed = batchCount || 0;

        // Delete test clinics only
        const { count: clinicCount } = await supabase
          .from('mocards_clinics')
          .delete()
          .or('clinic_name.ilike.%test%,clinic_name.ilike.%demo%,clinic_name.ilike.%sample%');
        stats.clinics_removed = clinicCount || 0;

      } else {
        // Reset test/demo data only

        // Delete test card transactions
        const { data: testCardIds } = await supabase
          .from('cards')
          .select('id')
          .or('control_number.ilike.%TEST%,control_number.ilike.%DEMO%,control_number.ilike.%SAMPLE%');

        if (testCardIds && testCardIds.length > 0) {
          const cardIds = testCardIds.map(c => c.id);

          const { count: transactionCount } = await supabase
            .from('card_transactions')
            .delete()
            .in('card_id', cardIds);
          stats.transactions_removed = transactionCount || 0;

          // Delete test appointments
          const { count: appointmentCount } = await supabase
            .from('appointments')
            .delete()
            .in('card_id', cardIds);
          stats.appointments_removed = appointmentCount || 0;
        }

        // Delete test cards
        const { count: cardCount } = await supabase
          .from('cards')
          .delete()
          .or('control_number.ilike.%TEST%,control_number.ilike.%DEMO%,control_number.ilike.%SAMPLE%');
        stats.cards_removed = cardCount || 0;

        // Delete test batches
        const { count: batchCount } = await supabase
          .from('card_batches')
          .delete()
          .or('batch_number.ilike.%TEST%,batch_number.ilike.%DEMO%,batch_number.ilike.%SAMPLE%');
        stats.batches_removed = batchCount || 0;

        // Delete test clinics
        const { count: clinicCount } = await supabase
          .from('mocards_clinics')
          .delete()
          .or('clinic_name.ilike.%test%,clinic_name.ilike.%demo%,clinic_name.ilike.%sample%');
        stats.clinics_removed = clinicCount || 0;
      }

      // Log the reset operation
      await supabase.from('card_transactions').insert({
        card_id: null,
        transaction_type: 'system_reset',
        performed_by: 'admin',
        details: {
          reset_type: resetType,
          stats: stats,
          timestamp: new Date().toISOString()
        }
      });

      setResetStats(stats);
      await loadTestCards();

    } catch (error) {
      console.error('Error during reset:', error);
      alert('Failed to perform reset operation');
    } finally {
      setIsResetting(false);
      setShowConfirmDialog(false);
    }
  };

  React.useEffect(() => {
    loadTestCards();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900">System Reset & Test Management</h2>
        </div>

        {/* Reset Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
            <h3 className="text-lg font-medium text-orange-800 mb-3">Reset Test Data Only</h3>
            <p className="text-sm text-orange-700 mb-4">
              Removes all cards, appointments, and transactions containing "TEST", "DEMO", or "SAMPLE" in their names.
            </p>
            <button
              onClick={() => {
                setResetType('test-only');
                setShowConfirmDialog(true);
              }}
              disabled={isResetting}
              className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Test Data</span>
            </button>
          </div>

          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="text-lg font-medium text-red-800 mb-3">Reset All Data</h3>
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">DANGER ZONE</span>
            </div>
            <p className="text-sm text-red-700 mb-4">
              Removes ALL cards, appointments, transactions, and test clinics. This action cannot be undone!
            </p>
            <button
              onClick={() => {
                setResetType('all');
                setShowConfirmDialog(true);
              }}
              disabled={isResetting}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Reset All Data</span>
            </button>
          </div>
        </div>

        {/* Reset Stats */}
        {resetStats && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-green-800 mb-3">Reset Completed Successfully</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="font-medium text-green-700">Cards Removed</div>
                <div className="text-2xl font-bold text-green-800">{resetStats.cards_removed}</div>
              </div>
              <div>
                <div className="font-medium text-green-700">Clinics Removed</div>
                <div className="text-2xl font-bold text-green-800">{resetStats.clinics_removed}</div>
              </div>
              <div>
                <div className="font-medium text-green-700">Appointments</div>
                <div className="text-2xl font-bold text-green-800">{resetStats.appointments_removed}</div>
              </div>
              <div>
                <div className="font-medium text-green-700">Transactions</div>
                <div className="text-2xl font-bold text-green-800">{resetStats.transactions_removed}</div>
              </div>
              <div>
                <div className="font-medium text-green-700">Batches</div>
                <div className="text-2xl font-bold text-green-800">{resetStats.batches_removed}</div>
              </div>
            </div>
          </div>
        )}

        {/* Test Card Management */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Test Card Management</h3>
            <button
              onClick={() => setShowTestCardModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Test Card</span>
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passcode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testCards.map((card) => (
                    <tr key={card.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{card.control_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{card.passcode}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{card.location_code}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          card.status === 'activated'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {card.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(card.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingCard(card)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTestCard(card.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {testCards.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No test cards found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm {resetType === 'all' ? 'Full' : 'Test Data'} Reset
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {resetType === 'all'
                ? 'This will permanently delete ALL data in the system including all cards, clinics, appointments, and transactions. This action cannot be undone!'
                : 'This will permanently delete all test/demo data including test cards, appointments, and related transactions. This action cannot be undone!'
              }
            </p>
            <div className="flex space-x-3">
              <button
                onClick={performReset}
                disabled={isResetting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isResetting}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Card Create/Edit Modal */}
      {(showTestCardModal || editingCard) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCard ? 'Edit Test Card' : 'Create Test Card'}
              </h3>
              <button
                onClick={() => {
                  setShowTestCardModal(false);
                  setEditingCard(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Control Number</label>
                <input
                  type="text"
                  value={editingCard ? editingCard.control_number : newTestCard.control_number}
                  onChange={(e) => editingCard
                    ? setEditingCard({...editingCard, control_number: e.target.value})
                    : setNewTestCard({...newTestCard, control_number: e.target.value})
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="TEST-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passcode</label>
                <input
                  type="text"
                  value={editingCard ? editingCard.passcode : newTestCard.passcode}
                  onChange={(e) => editingCard
                    ? setEditingCard({...editingCard, passcode: e.target.value})
                    : setNewTestCard({...newTestCard, passcode: e.target.value})
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Code</label>
                <select
                  value={editingCard ? editingCard.location_code : newTestCard.location_code}
                  onChange={(e) => editingCard
                    ? setEditingCard({...editingCard, location_code: e.target.value})
                    : setNewTestCard({...newTestCard, location_code: e.target.value})
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="PHL">PHL</option>
                  <option value="NYC">NYC</option>
                  <option value="TEST">TEST</option>
                </select>
              </div>

              {editingCard && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingCard.status}
                    onChange={(e) => setEditingCard({...editingCard, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="unactivated">Unactivated</option>
                    <option value="activated">Activated</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingCard ? updateTestCard : createTestCard}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                {editingCard ? 'Update' : 'Create'} Test Card
              </button>
              <button
                onClick={() => {
                  setShowTestCardModal(false);
                  setEditingCard(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};