import { useState, useEffect } from 'react';
import { streamlinedOps, Card, Clinic, CardBatch } from '../lib/streamlined-operations';
import {
  Search,
  Download,
  MoreVertical,
  Edit3,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  CreditCard,
  MapPin,
} from 'lucide-react';

interface CardManagementProps {
  token: string | null;
}

interface CardWithDetails extends Card {
  clinics: { clinic_name: string; clinic_code: string } | null;
  card_batches: { batch_number: string } | null;
  card_perks?: any[];
}

export function CardManagement({ }: CardManagementProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data state
  const [cards, setCards] = useState<CardWithDetails[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [batches, setBatches] = useState<CardBatch[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clinicFilter, setClinicFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Modal states
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    unassigned: 0,
    assigned: 0,
    activated: 0,
    expired: 0,
    suspended: 0,
  });

  useEffect(() => {
    loadCardData();
  }, [currentPage, searchQuery, statusFilter, clinicFilter, batchFilter]);

  const loadCardData = async () => {
    setLoading(true);
    try {
      const [cardsData, clinicsData, batchesData] = await Promise.all([
        streamlinedOps.getAllCards(itemsPerPage, (currentPage - 1) * itemsPerPage),
        streamlinedOps.getAllClinics(),
        streamlinedOps.getAllBatches(),
      ]);

      // Apply filters
      let filteredCards = cardsData;

      if (searchQuery) {
        filteredCards = filteredCards.filter(card =>
          card.control_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.passcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.clinics?.clinic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.card_batches?.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.status === statusFilter);
      }

      if (clinicFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.clinic_id === clinicFilter);
      }

      if (batchFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.batch_id === batchFilter);
      }

      setCards(filteredCards);
      setClinics(clinicsData);
      setBatches(batchesData);

      // Calculate stats
      const statsData = {
        total: cardsData.length,
        unassigned: cardsData.filter(c => c.status === 'unassigned').length,
        assigned: cardsData.filter(c => c.status === 'assigned').length,
        activated: cardsData.filter(c => c.status === 'activated').length,
        expired: cardsData.filter(c => c.status === 'expired').length,
        suspended: cardsData.filter(c => c.status === 'suspended').length,
      };
      setStats(statsData);

    } catch (err: any) {
      setError(err.message || 'Failed to load card data');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCards.length === cards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(cards.map(card => card.id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedCards.length === 0) {
      setError('Please select cards to update');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updatePromises = selectedCards.map(cardId =>
        streamlinedOps.updateCard(cardId, { status: newStatus as any })
      );

      await Promise.all(updatePromises);
      setSuccess(`Successfully updated ${selectedCards.length} cards to ${newStatus}`);
      setSelectedCards([]);
      setShowBulkActions(false);
      await loadCardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update cards');
    } finally {
      setLoading(false);
    }
  };

  const handleReassignCards = async (newClinicId: string) => {
    if (selectedCards.length === 0) {
      setError('Please select cards to reassign');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updatePromises = selectedCards.map(cardId =>
        streamlinedOps.updateCard(cardId, {
          clinic_id: newClinicId,
          assigned_at: new Date().toISOString()
        })
      );

      await Promise.all(updatePromises);
      const clinic = clinics.find(c => c.id === newClinicId);
      setSuccess(`Successfully reassigned ${selectedCards.length} cards to ${clinic?.clinic_name}`);
      setSelectedCards([]);
      setShowBulkActions(false);
      await loadCardData();
    } catch (err: any) {
      setError(err.message || 'Failed to reassign cards');
    } finally {
      setLoading(false);
    }
  };

  const exportCards = () => {
    const csvContent = [
      ['Control Number', 'Passcode', 'Status', 'Clinic', 'Batch', 'Location Code', 'Created', 'Assigned'].join(','),
      ...cards.map(card => [
        card.control_number,
        card.passcode,
        card.status,
        card.clinics?.clinic_name || 'Unassigned',
        card.card_batches?.batch_number || '',
        card.location_code,
        new Date(card.created_at).toLocaleDateString(),
        card.assigned_at ? new Date(card.assigned_at).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cards-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unassigned': return <Clock className="h-4 w-4" />;
      case 'assigned': return <Users className="h-4 w-4" />;
      case 'activated': return <CheckCircle className="h-4 w-4" />;
      case 'expired': return <AlertTriangle className="h-4 w-4" />;
      case 'suspended': return <XCircle className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unassigned': return 'bg-gray-100 text-gray-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'activated': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Cards</p>
              <p className="text-lg font-semibold text-gray-900">{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-gray-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Unassigned</p>
              <p className="text-lg font-semibold text-gray-900">{stats.unassigned.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Assigned</p>
              <p className="text-lg font-semibold text-gray-900">{stats.assigned.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Activated</p>
              <p className="text-lg font-semibold text-gray-900">{stats.activated.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-lg font-semibold text-gray-900">{stats.expired.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Suspended</p>
              <p className="text-lg font-semibold text-gray-900">{stats.suspended.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls and Filters */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search cards, control numbers, passcodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                disabled={selectedCards.length === 0}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Bulk Actions ({selectedCards.length})
              </button>

              <button
                onClick={exportCards}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>

              <button
                onClick={loadCardData}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Assigned</option>
                <option value="activated">Activated</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
              <select
                value={clinicFilter}
                onChange={(e) => setClinicFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Clinics</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.clinic_name} ({clinic.clinic_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Batches</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_number} ({batch.total_cards} cards)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                defaultValue="50"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedCards.length > 0 && (
          <div className="p-4 bg-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-900">
                  {selectedCards.length} cards selected
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('activated')}
                    className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('suspended')}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('expired')}
                    className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full hover:bg-yellow-200"
                  >
                    Expire
                  </button>

                  <select
                    onChange={(e) => e.target.value && handleReassignCards(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                    defaultValue=""
                  >
                    <option value="">Reassign to clinic...</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.clinic_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowBulkActions(false);
                  setSelectedCards([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Cards Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCards.length === cards.length && cards.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Card Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading cards...
                  </td>
                </tr>
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No cards found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                cards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCards.includes(card.id)}
                        onChange={() => handleCardSelect(card.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{card.control_number}</div>
                        <div className="text-sm text-gray-500">{card.passcode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                        {getStatusIcon(card.status)}
                        <span className="ml-1 capitalize">{card.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {card.clinics ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{card.clinics.clinic_name}</div>
                          <div className="text-sm text-gray-500">{card.clinics.clinic_code}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.card_batches?.batch_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <MapPin className="h-3 w-3 mr-1" />
                        {card.location_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(card.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {cards.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, stats.total)}</span> of{' '}
                  <span className="font-medium">{stats.total.toLocaleString()}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={cards.length < itemsPerPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}