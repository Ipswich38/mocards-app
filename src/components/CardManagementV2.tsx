import { useState, useEffect } from 'react';
import { streamlinedOps, Card, ClinicCodeByRegion } from '../lib/streamlined-operations';
import {
  Search,
  Download,
  RefreshCw,
  CreditCard,
  CheckCircle,
  Clock,
  MapPin,
  Building,
  Users
} from 'lucide-react';

interface CardManagementV2Props {
  token: string | null;
}

export function CardManagementV2({ }: CardManagementV2Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [cards, setCards] = useState<Card[]>([]);
  const [clinicCodes, setClinicCodes] = useState<ClinicCodeByRegion[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activationFilter, setActivationFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalCards, setTotalCards] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    unactivated: 0,
    activated: 0,
    byRegion: {
      visayas: 0,
      luzon_4a: 0,
      ncr: 0,
      unassigned: 0
    }
  });

  useEffect(() => {
    loadData();
  }, [currentPage, searchQuery, activationFilter, regionFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};

      if (activationFilter === 'activated') {
        filters.activated = true;
      } else if (activationFilter === 'unactivated') {
        filters.activated = false;
      }

      if (searchQuery) {
        filters.search = searchQuery;
      }

      const [cardsData, clinicData] = await Promise.all([
        (streamlinedOps as any).getCardsV2(itemsPerPage, (currentPage - 1) * itemsPerPage, filters),
        (streamlinedOps as any).getClinicCodesByRegion()
      ]);

      setCards(cardsData.cards);
      setTotalCards(cardsData.total);
      setClinicCodes(clinicData);

      // Calculate stats
      await calculateStats();
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load card data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      // Get all cards for stats
      const allCards = await (streamlinedOps as any).getCardsV2(10000, 0);
      const cards = allCards.cards;

      const stats = {
        total: cards.length,
        unactivated: cards.filter((c: any) => !c.is_activated).length,
        activated: cards.filter((c: any) => c.is_activated).length,
        byRegion: {
          visayas: 0,
          luzon_4a: 0,
          ncr: 0,
          unassigned: cards.filter((c: any) => !c.is_activated).length
        }
      };

      // Count by region
      for (const card of cards.filter((c: any) => c.is_activated)) {
        const clinicCode = clinicCodes.find((cc: any) => cc.clinic_code === card.clinic_code_v2);
        if (clinicCode) {
          stats.byRegion[clinicCode.region_type as keyof typeof stats.byRegion]++;
        }
      }

      setStats(stats);
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleGenerateCards = async () => {
    if (!confirm('This will delete all existing cards and generate 10,000 fresh cards. Are you sure?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await (streamlinedOps as any).generateFreshCardsV2(10000);
      if (result) {
        setSuccess('Successfully generated 10,000 fresh unactivated cards!');
        await loadData();
      } else {
        throw new Error('Failed to generate cards');
      }
    } catch (err: any) {
      setError('Error generating cards: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCards = () => {
    const csvHeader = 'Card Number,Control Number,Location Code,Clinic Code,Status,Activated At\n';
    const csvData = cards.map(card =>
      `${card.card_number || ''},${card.control_number_v2 || ''},${card.location_code_v2 || ''},${card.clinic_code_v2 || ''},${card.status || ''},${card.activated_at || ''}`
    ).join('\n');

    const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mocards-v2-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (card: Card) => {
    if (card.is_activated) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusColor = (card: Card) => {
    if (card.is_activated) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  const getRegionName = (clinicCodeValue?: string) => {
    const clinicCode = clinicCodes.find(cc => cc.clinic_code === clinicCodeValue);
    return clinicCode?.region_name || 'Unassigned';
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="glass-card animate-float">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-100 mb-2">Card Management V2.0</h2>
            <p className="text-slate-300 text-lg">Manage MOC cards with new control number format</p>
          </div>
          <button
            onClick={handleGenerateCards}
            disabled={loading}
            className="glass-button flex items-center px-6 py-3"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              borderColor: '#ef4444'
            }}
          >
            <RefreshCw className={`h-5 w-5 mr-3 ${loading ? 'animate-spin' : ''}`} />
            Generate 10K Cards
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="glass-card glass-hover animate-pulse-glow">
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <CreditCard className="h-8 w-8 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Total Cards</p>
              <p className="text-2xl font-bold text-slate-100">{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card glass-hover animate-pulse-glow" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-yellow-500/20">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Unactivated</p>
              <p className="text-2xl font-bold text-slate-100">{stats.unactivated.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card glass-hover animate-pulse-glow" style={{ animationDelay: '1s' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Activated</p>
              <p className="text-2xl font-bold text-slate-100">{stats.activated.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card glass-hover animate-pulse-glow" style={{ animationDelay: '1.5s' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Building className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Visayas</p>
              <p className="text-2xl font-bold text-slate-100">{stats.byRegion.visayas.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card glass-hover animate-pulse-glow" style={{ animationDelay: '2s' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-orange-500/20">
              <MapPin className="h-8 w-8 text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Luzon 4A</p>
              <p className="text-2xl font-bold text-slate-100">{stats.byRegion.luzon_4a.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card glass-hover animate-pulse-glow" style={{ animationDelay: '2.5s' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-indigo-500/20">
              <Users className="h-8 w-8 text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">NCR</p>
              <p className="text-2xl font-bold text-slate-100">{stats.byRegion.ncr.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by control number or card number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <select
              value={activationFilter}
              onChange={(e) => setActivationFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Cards</option>
              <option value="unactivated">Unactivated</option>
              <option value="activated">Activated</option>
            </select>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Regions</option>
              <option value="visayas">Visayas</option>
              <option value="luzon_4a">Luzon 4A</option>
              <option value="ncr">NCR</option>
            </select>

            <button
              onClick={exportCards}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Card Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Control Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="animate-spin h-5 w-5 text-blue-600 mr-2" />
                      Loading cards...
                    </div>
                  </td>
                </tr>
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No cards found matching your criteria
                  </td>
                </tr>
              ) : (
                cards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Card #{card.card_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {card.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {card.control_number_v2}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {card.location_code_v2 ? (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            {card.location_code_v2}
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {card.clinic_code_v2 ? (
                          <div>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-gray-400 mr-1" />
                              {card.clinic_code_v2}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getRegionName(card.clinic_code_v2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(card)}`}>
                        {getStatusIcon(card)}
                        <span className="ml-1">
                          {card.is_activated ? 'Activated' : 'Unactivated'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.activated_at ? new Date(card.activated_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage * itemsPerPage >= totalCards}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCards)}</span> of{' '}
                <span className="font-medium">{totalCards}</span> cards
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * itemsPerPage >= totalCards}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
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
    </div>
  );
}