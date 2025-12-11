import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search,
  Download,
  RefreshCw,
  Eye,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X
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

  const cardsPerPage = 50;

  useEffect(() => {
    loadCards();
    loadStats();
  }, [currentPage, statusFilter, searchQuery]);

  const loadCards = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('cards')
        .select('*', { count: 'exact' });

      // Apply status filter
      if (statusFilter === 'unactivated') {
        query = query.eq('is_activated', false);
      } else if (statusFilter === 'activated') {
        query = query.eq('is_activated', true);
      }

      // Apply search filter
      if (searchQuery.trim()) {
        // Try to parse as number for card_number search
        const isNumeric = !isNaN(Number(searchQuery));
        if (isNumeric) {
          query = query.or(
            `control_number.ilike.%${searchQuery}%,control_number_v2.ilike.%${searchQuery}%,card_number.eq.${searchQuery}`
          );
        } else {
          query = query.or(
            `control_number.ilike.%${searchQuery}%,control_number_v2.ilike.%${searchQuery}%`
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
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by control number or card number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input-field"
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
                        {card.clinic_code_v2 || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {card.activated_at
                          ? new Date(card.activated_at).toLocaleDateString()
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewCard(card)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
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
    </div>
  );
}