import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SearchComponent } from './SearchComponent';
import {
  Download,
  RefreshCw,
  Eye,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRightLeft,
  Package
} from 'lucide-react';

interface Card {
  id: string;
  control_number?: string;
  control_number_v2?: string;
  card_number?: number;
  is_activated?: boolean;
  status?: string;
  location_code_v2?: string;
  clinic_code_v2?: string;
  activated_at?: string;
  created_at?: string;
  assigned_clinic_id?: string;
  assigned_at?: string;
}

interface Clinic {
  id: string;
  clinic_name: string;
  clinic_code: string;
  status: string;
}

export function MOCCardManagement() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unactivated' | 'activated'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [stats, setStats] = useState({
    totalCards: 0,
    activatedCards: 0,
    unactivatedCards: 0,
    v2Cards: 0
  });
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [showAssignmentDropdown, setShowAssignmentDropdown] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showBatchAssignment, setShowBatchAssignment] = useState(false);
  const [activationLoading, setActivationLoading] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [deactivationLoading, setDeactivationLoading] = useState<string | null>(null);
  const [batchForm, setBatchForm] = useState({
    startCardNumber: '',
    endCardNumber: '',
    selectedClinicId: ''
  });
  const [batchLoading, setBatchLoading] = useState(false);

  // Enhanced search functionality
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);

  const cardsPerPage = 50;

  useEffect(() => {
    loadCards();
    loadStats();
    loadClinics();
  }, [currentPage, statusFilter, searchQuery]);

  // Load search suggestions when typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        getSearchSuggestions(searchQuery);
      } else {
        setSearchSuggestions([]);
      }
    }, 300); // Debounce search suggestions

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Enhanced search functionality
  const getSearchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      // Get suggestions for control numbers
      const { data: controlSuggestions } = await supabase
        .from('cards')
        .select('control_number, control_number_v2')
        .or(`control_number.ilike.${query}%,control_number_v2.ilike.${query}%`)
        .limit(5);

      // Get clinic name suggestions
      const { data: clinicSuggestions } = await supabase
        .from('mocards_clinics')
        .select('clinic_name')
        .ilike('clinic_name', `${query}%`)
        .limit(3);

      const suggestions = [
        ...(controlSuggestions || []).map(card => ({
          id: `control-${card.control_number || card.control_number_v2}`,
          text: card.control_number_v2 || card.control_number || '',
          type: 'control_number' as const
        })),
        ...(clinicSuggestions || []).map(clinic => ({
          id: `clinic-${clinic.clinic_name}`,
          text: clinic.clinic_name,
          type: 'clinic_name' as const
        }))
      ].filter((suggestion, index, self) =>
        index === self.findIndex(s => s.text === suggestion.text)
      );

      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
    }
  };

  const logSearchActivity = async (searchTerm: string, resultsFound: number) => {
    try {
      // Log search activity using the enhanced search schema function
      await supabase.rpc('log_search_activity', {
        p_user_id: 'admin',
        p_user_type: 'admin',
        p_search_query: searchTerm,
        p_search_type: 'mixed',
        p_results_found: resultsFound,
        p_search_metadata: {
          interface: 'mocards_management',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Silently fail if the search logging isn't available yet
      console.debug('Search logging not available:', error);
    }
  };

  const handleEnhancedSearch = async (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);

    // Log the search activity
    if (query.trim()) {
      setTimeout(() => {
        logSearchActivity(query, totalCards);
      }, 1000); // Delay to get accurate results count
    }
  };

  const handleSearchResultSelect = (result: any) => {
    if (result.type === 'card') {
      const card = cards.find(c => c.id === result.id);
      if (card) {
        handleViewCard(card);
      }
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    setSearchQuery(suggestion.text);
    setCurrentPage(1);
  };

  const loadCards = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('cards')
        .select(`
          *,
          mocards_clinics!assigned_clinic_id(
            id,
            clinic_name,
            clinic_code
          )
        `, { count: 'exact' });

      // Apply status filter
      if (statusFilter === 'unactivated') {
        query = query.eq('is_activated', false);
      } else if (statusFilter === 'activated') {
        query = query.eq('is_activated', true);
      }

      // Apply enhanced search filter
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.trim();
        const isNumeric = !isNaN(Number(searchTerm));

        if (isNumeric) {
          // Search by card number or control numbers containing the number
          query = query.or(
            `control_number.ilike.%${searchTerm}%,control_number_v2.ilike.%${searchTerm}%,card_number.eq.${searchTerm}`
          );
        } else {
          // Text search - include clinic name search via join
          query = query.or(
            `control_number.ilike.%${searchTerm}%,control_number_v2.ilike.%${searchTerm}%,mocards_clinics.clinic_name.ilike.%${searchTerm}%`
          );
        }
      }

      // Apply pagination
      const from = (currentPage - 1) * cardsPerPage;
      const to = from + cardsPerPage - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('card_number', { ascending: true });

      if (error) throw error;

      setCards(data || []);
      setTotalCards(count || 0);
    } catch (err: any) {
      setError('Failed to load cards: ' + err.message);
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total cards count
      const { count: totalCount } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });

      // Get activated cards count
      const { count: activatedCount } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_activated', true);

      // Get unactivated cards count
      const { count: unactivatedCount } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_activated', false);

      // Get V2 cards count (new system)
      const { count: v2Count } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('migration_version', 2);

      setStats({
        totalCards: totalCount || 0,
        activatedCards: activatedCount || 0,
        unactivatedCards: unactivatedCount || 0,
        v2Cards: v2Count || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('mocards_clinics')
        .select('id, clinic_name, clinic_code, status')
        .eq('status', 'active')
        .order('clinic_name');

      if (error) throw error;
      setClinics(data || []);
    } catch (err) {
      console.error('Error loading clinics:', err);
    }
  };

  const handleActivateCard = async (cardId: string) => {
    setActivationLoading(cardId);
    try {
      // Update the card to activated status
      const { error } = await supabase
        .from('cards')
        .update({
          is_activated: true,
          status: 'activated',
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;

      // Auto-assign default perks
      const { data: defaultPerks } = await supabase
        .from('default_perk_templates')
        .select('*')
        .eq('is_default', true);

      if (defaultPerks && defaultPerks.length > 0) {
        const perkAssignments = defaultPerks.map(perk => ({
          card_id: cardId,
          perk_type: perk.perk_type,
          perk_value: perk.perk_value,
          is_claimed: false,
          created_at: new Date().toISOString()
        }));

        await supabase
          .from('card_perks')
          .insert(perkAssignments);
      }

      setSuccessMessage(`Card activated successfully at ${new Date().toLocaleString()}`);
      setTimeout(() => setSuccessMessage(''), 5000);

      // Refresh cards and stats
      loadCards();
      loadStats();

    } catch (err: any) {
      setError('Failed to activate card: ' + err.message);
    } finally {
      setActivationLoading(null);
    }
  };

  const assignCardToClinic = async (cardId: string, clinicId: string) => {
    setAssignmentLoading(cardId);
    try {
      const clinic = clinics.find(c => c.id === clinicId);
      if (!clinic) throw new Error('Clinic not found');

      // Update the card assignment
      const { error } = await supabase
        .from('cards')
        .update({
          assigned_clinic_id: clinicId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          assigned_by: 'admin',
          assignment_method: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;

      // Log the assignment
      await supabase
        .from('card_assignment_history')
        .insert({
          card_id: cardId,
          clinic_id: clinicId,
          assignment_type: 'assigned',
          assigned_by_type: 'admin',
          assigned_by_id: 'admin',
          assigned_by_name: 'Admin Portal',
          assignment_reason: 'Manual assignment via MOCARDS management',
          assignment_details: {
            clinic_name: clinic.clinic_name,
            clinic_code: clinic.clinic_code,
            assigned_via: 'mocards_management'
          }
        });

      // Show success message
      setSuccessMessage(`Card successfully assigned to ${clinic.clinic_name} at ${new Date().toLocaleString()}`);
      setTimeout(() => setSuccessMessage(''), 5000);

      // Refresh cards
      loadCards();
      setShowAssignmentDropdown(null);

    } catch (err: any) {
      setError('Failed to assign card: ' + err.message);
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleResetCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to reset this card to a fresh unassigned state? This will remove all assignments, activation status, and perks.')) {
      return;
    }

    setResetLoading(cardId);
    try {
      // Reset the card to fresh state
      const { error: updateError } = await supabase
        .from('cards')
        .update({
          is_activated: false,
          status: 'unassigned',
          assigned_clinic_id: null,
          activated_at: null,
          assigned_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (updateError) throw updateError;

      // Remove all perks associated with this card
      const { error: perksError } = await supabase
        .from('card_perks')
        .delete()
        .eq('card_id', cardId);

      if (perksError) {
        console.warn('Failed to remove card perks:', perksError);
      }

      // Show success message
      setSuccessMessage(`Card successfully reset to fresh state at ${new Date().toLocaleString()}`);
      setTimeout(() => setSuccessMessage(''), 5000);

      // Refresh cards
      loadCards();

    } catch (err: any) {
      setError('Failed to reset card: ' + err.message);
    } finally {
      setResetLoading(null);
    }
  };

  const handleDeactivateCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to deactivate this card? This will keep the clinic assignment but deactivate the card.')) {
      return;
    }

    setDeactivationLoading(cardId);
    try {
      // Deactivate the card but keep assignment
      const { error } = await supabase
        .from('cards')
        .update({
          is_activated: false,
          status: 'assigned', // Keep as assigned since clinic assignment remains
          activated_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;

      // Optionally mark perks as inactive instead of deleting them
      await supabase
        .from('card_perks')
        .update({
          is_claimed: false, // Reset claim status
          updated_at: new Date().toISOString()
        })
        .eq('card_id', cardId);

      // Show success message
      setSuccessMessage(`Card successfully deactivated at ${new Date().toLocaleString()}`);
      setTimeout(() => setSuccessMessage(''), 5000);

      // Refresh cards
      loadCards();

    } catch (err: any) {
      setError('Failed to deactivate card: ' + err.message);
    } finally {
      setDeactivationLoading(null);
    }
  };

  const handleBatchAssignment = async () => {
    if (!batchForm.startCardNumber || !batchForm.endCardNumber || !batchForm.selectedClinicId) {
      setError('Please fill in all batch assignment fields');
      return;
    }

    const startNum = parseInt(batchForm.startCardNumber);
    const endNum = parseInt(batchForm.endCardNumber);

    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
      setError('Please enter valid card number range');
      return;
    }

    setBatchLoading(true);
    try {
      const clinic = clinics.find(c => c.id === batchForm.selectedClinicId);
      if (!clinic) throw new Error('Clinic not found');

      // Get cards in the specified range
      const { data: cardsInRange, error: fetchError } = await supabase
        .from('cards')
        .select('id, card_number, control_number_v2')
        .gte('card_number', startNum)
        .lte('card_number', endNum)
        .order('card_number');

      if (fetchError) throw fetchError;

      if (!cardsInRange || cardsInRange.length === 0) {
        setError('No cards found in the specified range');
        return;
      }

      // Update all cards in the range
      const cardIds = cardsInRange.map(card => card.id);
      const { error: updateError } = await supabase
        .from('cards')
        .update({
          assigned_clinic_id: batchForm.selectedClinicId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          assigned_by: 'admin',
          assignment_method: 'admin',
          updated_at: new Date().toISOString()
        })
        .in('id', cardIds);

      if (updateError) throw updateError;

      // Log batch assignment
      const assignmentRecords = cardsInRange.map(card => ({
        card_id: card.id,
        clinic_id: batchForm.selectedClinicId,
        assignment_type: 'assigned',
        assigned_by_type: 'admin',
        assigned_by_id: 'admin',
        assigned_by_name: 'Admin Portal',
        assignment_reason: `Batch assignment: Cards ${startNum}-${endNum}`,
        assignment_details: {
          clinic_name: clinic.clinic_name,
          clinic_code: clinic.clinic_code,
          assigned_via: 'batch_assignment',
          batch_range: `${startNum}-${endNum}`,
          card_number: card.card_number
        }
      }));

      await supabase
        .from('card_assignment_history')
        .insert(assignmentRecords);

      // Show success message
      setSuccessMessage(`Successfully assigned ${cardsInRange.length} cards (${startNum}-${endNum}) to ${clinic.clinic_name} at ${new Date().toLocaleString()}`);
      setTimeout(() => setSuccessMessage(''), 8000);

      // Reset form and refresh
      setBatchForm({ startCardNumber: '', endCardNumber: '', selectedClinicId: '' });
      setShowBatchAssignment(false);
      loadCards();

    } catch (err: any) {
      setError('Batch assignment failed: ' + err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const exportCards = async () => {
    try {
      setLoading(true);

      // Get all cards for export
      let query = supabase.from('cards').select('*');

      if (statusFilter === 'unactivated') {
        query = query.eq('is_activated', false);
      } else if (statusFilter === 'activated') {
        query = query.eq('is_activated', true);
      }

      const { data, error } = await query.order('card_number', { ascending: true });

      if (error) throw error;

      // Create CSV
      const csvHeader = 'Card Number,Control Number V2,Status,Location Code,Clinic Code,Activated At,Created At\n';
      const csvData = (data || []).map(card =>
        `${card.card_number || ''},${card.control_number_v2 || ''},${card.is_activated ? 'Activated' : 'Unactivated'},${card.location_code_v2 || ''},${card.clinic_code_v2 || ''},${card.activated_at || ''},${card.created_at || ''}`
      ).join('\n');

      const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moc-cards-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      setError('Failed to export cards: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCards / cardsPerPage);

  const getStatusBadge = (card: Card) => {
    if (card.is_activated) {
      return (
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium flex items-center">
          <CheckCircle className="h-3 w-3 mr-1" />
          Activated
        </span>
      );
    } else {
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Unactivated
        </span>
      );
    }
  };

  const handleViewCard = (card: Card) => {
    setSelectedCard(card);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCard(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">MOCARDS Management</h2>
            <p className="text-gray-600">
              Manage {stats.totalCards.toLocaleString()} MOC cards with organized columns and tables
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBatchAssignment(true)}
              className="btn btn-outline flex items-center px-4 py-2"
            >
              <Package className="h-4 w-4 mr-2" />
              Batch Assign
            </button>
            <button
              onClick={exportCards}
              disabled={loading}
              className="btn btn-outline flex items-center px-4 py-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => {loadCards(); loadStats();}}
              disabled={loading}
              className="btn btn-primary flex items-center px-4 py-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cards</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCards.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activated</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activatedCards.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unactivated</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unactivatedCards.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">V2 System</p>
              <p className="text-2xl font-bold text-gray-900">{stats.v2Cards.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Enhanced Search */}
          <div className="flex-1 max-w-2xl">
            <SearchComponent
              placeholder="Search by control number, card number, or clinic name..."
              suggestions={searchSuggestions}
              onSearch={handleEnhancedSearch}
              onResultSelect={handleSearchResultSelect}
              onSuggestionSelect={handleSuggestionSelect}
              isLoading={loading}
              results={[]}
              variant="default"
              className="w-full"
              showRecentSearches={true}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input-field min-w-[140px]"
          >
            <option value="all">All Cards</option>
            <option value="unactivated">Unactivated</option>
            <option value="activated">Activated</option>
          </select>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {cards.length} of {totalCards.toLocaleString()} cards
              {statusFilter !== 'all' && ` (${statusFilter})`}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setStatusFilter('unactivated')}
                className="btn btn-outline btn-sm"
              >
                View Unactivated ({stats.unactivatedCards.toLocaleString()})
              </button>
              <button
                onClick={() => setStatusFilter('activated')}
                className="btn btn-outline btn-sm"
              >
                View Activated ({stats.activatedCards.toLocaleString()})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className="btn btn-outline btn-sm"
              >
                View All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Cards Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Card Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Control Number V2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activated At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-gray-600">Loading cards...</span>
                    </div>
                  </td>
                </tr>
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No cards found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                cards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm font-medium text-gray-900">
                        #{card.card_number?.toString().padStart(5, '0')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm text-blue-600">
                        {card.control_number_v2 || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(card)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {card.location_code_v2 ? `Code ${card.location_code_v2}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(card as any).assigned_clinic?.clinic_name || 'Unassigned'}
                      </div>
                      {(card as any).assigned_clinic && (
                        <div className="text-xs text-gray-500">
                          Code: {(card as any).assigned_clinic.clinic_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {card.activated_at
                          ? new Date(card.activated_at).toLocaleDateString()
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewCard(card)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>

                        {/* Admin-Only Activation Button */}
                        {!card.is_activated && (
                          <button
                            onClick={() => handleActivateCard(card.id)}
                            disabled={activationLoading === card.id}
                            className="text-green-600 hover:text-green-900 flex items-center disabled:opacity-50"
                          >
                            {activationLoading === card.id ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Activate
                          </button>
                        )}

                        {/* Reset Button - For cards that have been tested */}
                        {(card.status === 'activated' || card.is_activated || card.status === 'assigned') && (
                          <button
                            onClick={() => handleResetCard(card.id)}
                            disabled={resetLoading === card.id}
                            className="text-orange-600 hover:text-orange-900 flex items-center disabled:opacity-50"
                            title="Reset card to fresh unassigned state"
                          >
                            {resetLoading === card.id ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Reset
                          </button>
                        )}

                        {/* Deactivate Button - For activated cards */}
                        {card.is_activated && (
                          <button
                            onClick={() => handleDeactivateCard(card.id)}
                            disabled={deactivationLoading === card.id}
                            className="text-red-600 hover:text-red-900 flex items-center disabled:opacity-50"
                            title="Deactivate card but keep assignment"
                          >
                            {deactivationLoading === card.id ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14L5 9l5-5m0 10l9-5-9-5" />
                              </svg>
                            )}
                            Deactivate
                          </button>
                        )}

                        {/* Assignment Dropdown */}
                        {!(card as any).assigned_clinic && (
                          <div className="relative">
                            <button
                              onClick={() => setShowAssignmentDropdown(
                                showAssignmentDropdown === card.id ? null : card.id
                              )}
                              disabled={assignmentLoading === card.id}
                              className="text-green-600 hover:text-green-900 flex items-center disabled:opacity-50"
                            >
                              {assignmentLoading === card.id ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <ArrowRightLeft className="h-4 w-4 mr-1" />
                              )}
                              Assign
                            </button>

                            {showAssignmentDropdown === card.id && (
                              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                <div className="p-3">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Assign to Clinic:</p>
                                  <div className="max-h-48 overflow-y-auto space-y-1">
                                    {clinics.map((clinic) => (
                                      <button
                                        key={clinic.id}
                                        onClick={() => assignCardToClinic(card.id, clinic.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center justify-between"
                                      >
                                        <div>
                                          <div className="font-medium text-gray-900">{clinic.clinic_name}</div>
                                          <div className="text-gray-500">Code: {clinic.clinic_code}</div>
                                        </div>
                                        <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => setShowAssignmentDropdown(null)}
                                    className="w-full mt-2 text-center px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {(card as any).assigned_clinic && (
                          <div className="flex items-center text-xs text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Assigned
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-outline p-2 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline p-2 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Details Modal */}
      {showModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <CreditCard className="h-6 w-6 mr-3 text-blue-600" />
                MOC Card Details
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Card Information</h4>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Card Number</label>
                    <p className="font-mono text-lg font-bold text-gray-900">
                      #{selectedCard.card_number?.toString().padStart(5, '0')}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Control Number V2</label>
                    <p className="font-mono text-blue-600 font-medium">
                      {selectedCard.control_number_v2 || 'Not assigned'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Legacy Control Number</label>
                    <p className="font-mono text-gray-600">
                      {selectedCard.control_number || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedCard)}
                    </div>
                  </div>
                </div>

                {/* Activation Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Activation Details</h4>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Location Code</label>
                    <p className="text-gray-900">
                      {selectedCard.location_code_v2 ? `Code ${selectedCard.location_code_v2}` : 'Not assigned'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Clinic Code</label>
                    <p className="text-gray-900">
                      {selectedCard.clinic_code_v2 || 'Not assigned'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Activated Date</label>
                    <p className="text-gray-900">
                      {selectedCard.activated_at
                        ? new Date(selectedCard.activated_at).toLocaleString()
                        : 'Not activated'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Created Date</label>
                    <p className="text-gray-900">
                      {selectedCard.created_at
                        ? new Date(selectedCard.created_at).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">System Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div><span className="text-gray-500">ID:</span> {selectedCard.id}</div>
                    <div><span className="text-gray-500">Status:</span> {selectedCard.status || 'active'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Assignment Modal */}
      {showBatchAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Package className="h-6 w-6 mr-3 text-blue-600" />
                Batch Card Assignment
              </h3>
              <button
                onClick={() => setShowBatchAssignment(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Card Number
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g., 1"
                  value={batchForm.startCardNumber}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, startCardNumber: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Card Number
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g., 100"
                  value={batchForm.endCardNumber}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, endCardNumber: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Clinic
                </label>
                <select
                  value={batchForm.selectedClinicId}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, selectedClinicId: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select a clinic...</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.clinic_name} (Code: {clinic.clinic_code})
                    </option>
                  ))}
                </select>
              </div>

              {batchForm.startCardNumber && batchForm.endCardNumber && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This will assign cards #{batchForm.startCardNumber} to #{batchForm.endCardNumber}
                    ({Math.abs(parseInt(batchForm.endCardNumber) - parseInt(batchForm.startCardNumber)) + 1} cards)
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowBatchAssignment(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAssignment}
                disabled={batchLoading || !batchForm.startCardNumber || !batchForm.endCardNumber || !batchForm.selectedClinicId}
                className="btn btn-primary disabled:opacity-50"
              >
                {batchLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Assign Cards
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}