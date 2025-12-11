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
  ChevronRight
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
  const [error, setError] = useState('');

  const cardsPerPage = 50;

  useEffect(() => {
    loadCards();
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
        query = query.or(
          `control_number.ilike.%${searchQuery}%,control_number_v2.ilike.%${searchQuery}%,card_number.eq.${searchQuery}`
        );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">MOC Card Management</h2>
            <p className="text-gray-600">
              Manage {totalCards.toLocaleString()} MOC cards with new control number format
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
              onClick={loadCards}
              disabled={loading}
              className="btn btn-primary flex items-center px-4 py-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
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

        {/* Stats Bar */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {cards.length} of {totalCards.toLocaleString()} cards
            {statusFilter !== 'all' && ` (${statusFilter})`}
            {searchQuery && ` matching "${searchQuery}"`}
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
                      <button className="text-blue-600 hover:text-blue-900 flex items-center">
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
    </div>
  );
}