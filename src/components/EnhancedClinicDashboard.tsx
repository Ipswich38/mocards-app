import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  CreditCard,
  BarChart,
  Activity,
  Users,
  TrendingUp,
  Gift,
  Search,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Award,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { SearchComponent } from './SearchComponent';
import { ClinicPerkCustomization } from './ClinicPerkCustomization';

interface ClinicCard {
  id: string;
  card_number: number;
  control_number: string;
  unified_control_number: string;
  display_card_number: number;
  passcode: string;
  status: string;
  is_activated: boolean;
  assigned_clinic_id?: string;
  assigned_at?: string;
  activated_at?: string;
  expires_at?: string;
  perks?: CardPerk[];
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

interface CardPerk {
  id: string;
  perk_type: string;
  perk_name: string;
  perk_value: number;
  is_claimed: boolean;
  claimed_at?: string;
  redemption_code?: string;
}

interface DashboardStats {
  totalCards: number;
  assignedCards: number;
  activatedCards: number;
  unassignedCards: number;
  todayRedemptions: number;
  totalRedemptions: number;
  totalPerkValue: number;
  activePerks: number;
  monthlyActivations: number;
  expiringCards: number;
}

interface EnhancedClinicDashboardProps {
  clinicCredentials: {
    clinicId: string;
    clinicCode: string;
    clinicName: string;
    token: string;
  };
  onBack: () => void;
}

export function EnhancedClinicDashboard({ clinicCredentials, onBack }: EnhancedClinicDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'redemptions' | 'perks' | 'search' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    totalCards: 10000,
    assignedCards: 0,
    activatedCards: 0,
    unassignedCards: 10000,
    todayRedemptions: 0,
    totalRedemptions: 0,
    totalPerkValue: 0,
    activePerks: 0,
    monthlyActivations: 0,
    expiringCards: 0
  });

  const [allCards, setAllCards] = useState<ClinicCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ClinicCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<ClinicCard | null>(null);
  const [cardFilter, setCardFilter] = useState<'all' | 'assigned' | 'activated' | 'unassigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Redemption states
  const [redemptions, setRedemptions] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [clinicCredentials.clinicId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAllCards(),
        loadStats(),
        loadRedemptions()
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllCards = async () => {
    try {
      // Use the clinic portal function to get all 10,000 cards with sync from admin
      const { data: cardsData, error } = await supabase.rpc('clinic_get_all_cards_mirror');

      if (error) throw error;

      // Transform data to include perk information
      const cardsWithPerks = await Promise.all(
        cardsData.map(async (card: any) => {
          const { data: perks } = await supabase
            .from('card_perks')
            .select(`
              id,
              perk_type,
              perk_name,
              perk_value,
              is_claimed,
              claimed_at,
              redemption_code
            `)
            .eq('card_id', card.id);

          return {
            ...card,
            perks: perks || []
          };
        })
      );

      setAllCards(cardsWithPerks);
      applyFilter(cardsWithPerks, cardFilter);
    } catch (err) {
      console.error('Error loading cards:', err);
      throw err;
    }
  };

  const loadStats = async () => {
    try {
      // Get comprehensive stats from all 10,000 cards
      const { data: allCardsData, error: cardsError } = await supabase.rpc('clinic_get_all_cards_mirror');

      if (cardsError) throw cardsError;

      // Calculate stats
      const activatedCards = allCardsData.filter((card: any) => card.is_activated).length;
      const assignedCards = allCardsData.filter((card: any) => card.assigned_clinic_id).length;
      const unassignedCards = 10000 - assignedCards;

      // Get redemption stats
      const { data: redemptionsData } = await supabase
        .from('card_perks')
        .select('*')
        .eq('is_claimed', true);

      const today = new Date().toDateString();
      const todayRedemptions = redemptionsData?.filter(r =>
        r.claimed_at && new Date(r.claimed_at).toDateString() === today
      ).length || 0;

      const totalPerkValue = redemptionsData?.reduce((sum, r) => sum + (r.perk_value || 0), 0) || 0;

      // Get monthly activations
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      const monthlyActivations = allCardsData.filter((card: any) =>
        card.activated_at && new Date(card.activated_at) >= firstOfMonth
      ).length;

      // Get expiring cards (expires within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringCards = allCardsData.filter((card: any) =>
        card.expires_at && new Date(card.expires_at) <= thirtyDaysFromNow
      ).length;

      setStats({
        totalCards: 10000,
        assignedCards,
        activatedCards,
        unassignedCards,
        todayRedemptions,
        totalRedemptions: redemptionsData?.length || 0,
        totalPerkValue,
        activePerks: allCardsData.reduce((sum: number, card: any) =>
          sum + (card.perks?.filter((p: any) => !p.is_claimed).length || 0), 0
        ),
        monthlyActivations,
        expiringCards
      });

    } catch (err) {
      console.error('Error loading stats:', err);
      throw err;
    }
  };

  const loadRedemptions = async () => {
    try {
      const { data, error } = await supabase
        .from('card_perks')
        .select(`
          *,
          card:cards(
            control_number,
            unified_control_number,
            customer_name,
            customer_phone
          )
        `)
        .eq('is_claimed', true)
        .order('claimed_at', { ascending: false });

      if (error) throw error;
      setRedemptions(data || []);
    } catch (err) {
      console.error('Error loading redemptions:', err);
      throw err;
    }
  };

  const applyFilter = (cards: ClinicCard[], filter: string) => {
    let filtered = cards;

    switch (filter) {
      case 'assigned':
        filtered = cards.filter(card => card.assigned_clinic_id === clinicCredentials.clinicId);
        break;
      case 'activated':
        filtered = cards.filter(card => card.is_activated);
        break;
      case 'unassigned':
        filtered = cards.filter(card => !card.assigned_clinic_id);
        break;
      default:
        filtered = cards;
    }

    if (searchQuery) {
      filtered = filtered.filter(card =>
        card.control_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.unified_control_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.card_number?.toString().includes(searchQuery) ||
        card.display_card_number?.toString().includes(searchQuery)
      );
    }

    setFilteredCards(filtered);
  };

  const handleRefresh = async () => {
    setRefreshLoading(true);
    try {
      await loadInitialData();
      setSuccess('Data refreshed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to refresh data');
      setTimeout(() => setError(''), 3000);
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleActivateCard = async (cardId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('activate_card', {
        card_id: cardId,
        clinic_id: clinicCredentials.clinicId
      });

      if (error) throw error;

      setSuccess('Card activated successfully');
      await loadAllCards();
      await loadStats();
    } catch (err: any) {
      setError('Failed to activate card: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Clinic Overview</h2>
          <p className="text-slate-400">{clinicCredentials.clinicName} Dashboard</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Total Cards in System</p>
              <p className="text-2xl font-bold text-white">{stats.totalCards.toLocaleString()}</p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Assigned Cards</p>
              <p className="text-2xl font-bold text-white">{stats.assignedCards.toLocaleString()}</p>
              <p className="text-xs text-slate-500">To all clinics</p>
            </div>
            <Users className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Activated Cards</p>
              <p className="text-2xl font-bold text-white">{stats.activatedCards.toLocaleString()}</p>
              <p className="text-xs text-slate-500">System-wide</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Available Cards</p>
              <p className="text-2xl font-bold text-white">{stats.unassignedCards.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Ready for assignment</p>
            </div>
            <Activity className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Today's Redemptions</p>
              <p className="text-2xl font-bold text-white">{stats.todayRedemptions}</p>
              <p className="text-xs text-slate-500">Across all clinics</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Total Redemptions</p>
              <p className="text-2xl font-bold text-white">{stats.totalRedemptions}</p>
              <p className="text-xs text-slate-500">All time</p>
            </div>
            <Gift className="h-8 w-8 text-pink-400" />
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Total Perk Value</p>
              <p className="text-2xl font-bold text-white">₱{stats.totalPerkValue.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Redeemed value</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">Monthly Activations</p>
              <p className="text-2xl font-bold text-white">{stats.monthlyActivations}</p>
              <p className="text-xs text-slate-500">This month</p>
            </div>
            <Calendar className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-elevated p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('search')}
            className="flex items-center space-x-3 p-4 border border-slate-600 rounded-lg hover:border-blue-500 transition-colors"
          >
            <Search className="h-5 w-5 text-blue-400" />
            <div className="text-left">
              <p className="font-medium text-white">Search Cards</p>
              <p className="text-xs text-slate-400">Find any card in 10,000 card database</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className="flex items-center space-x-3 p-4 border border-slate-600 rounded-lg hover:border-green-500 transition-colors"
          >
            <CreditCard className="h-5 w-5 text-green-400" />
            <div className="text-left">
              <p className="font-medium text-white">Manage Cards</p>
              <p className="text-xs text-slate-400">View, activate, and manage cards</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('redemptions')}
            className="flex items-center space-x-3 p-4 border border-slate-600 rounded-lg hover:border-purple-500 transition-colors"
          >
            <Gift className="h-5 w-5 text-purple-400" />
            <div className="text-left">
              <p className="font-medium text-white">Redemptions</p>
              <p className="text-xs text-slate-400">Process perk redemptions</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCardManagement = () => (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white">Card Management</h2>
          <p className="text-slate-400">All {stats.totalCards.toLocaleString()} cards with full details</p>
        </div>

        <div className="flex space-x-2">
          <select
            value={cardFilter}
            onChange={(e) => {
              const filter = e.target.value as any;
              setCardFilter(filter);
              applyFilter(allCards, filter);
            }}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="all">All Cards ({stats.totalCards.toLocaleString()})</option>
            <option value="assigned">Assigned ({stats.assignedCards.toLocaleString()})</option>
            <option value="activated">Activated ({stats.activatedCards.toLocaleString()})</option>
            <option value="unassigned">Available ({stats.unassignedCards.toLocaleString()})</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchComponent
          placeholder="Search by card number, control number, or format..."
          onSearch={(query) => {
            setSearchQuery(query);
            applyFilter(allCards, cardFilter);
          }}
          variant="compact"
        />
      </div>

      {/* Cards Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Card Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Control Numbers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Clinic Assignment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredCards.slice(0, 50).map((card) => (
                <tr key={card.id} className="hover:bg-slate-800">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">#{card.card_number}</p>
                      <p className="text-sm text-slate-400">Display: {card.display_card_number}</p>
                      <p className="text-xs text-slate-500">ID: {card.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-white">{card.control_number}</p>
                      <p className="text-xs text-slate-400">{card.unified_control_number}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        card.is_activated
                          ? 'bg-green-100 text-green-800'
                          : card.assigned_clinic_id
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {card.is_activated ? 'Activated' : card.assigned_clinic_id ? 'Assigned' : 'Available'}
                      </span>
                      {card.activated_at && (
                        <p className="text-xs text-slate-500">
                          Activated: {new Date(card.activated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {card.assigned_clinic_id ? (
                      <div>
                        <p className="text-sm text-white">
                          {card.assigned_clinic_id === clinicCredentials.clinicId ? 'Your Clinic' : 'Other Clinic'}
                        </p>
                        <p className="text-xs text-slate-400">
                          Assigned: {card.assigned_at ? new Date(card.assigned_at).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedCard(card)}
                        className="p-2 text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {card.assigned_clinic_id === clinicCredentials.clinicId && !card.is_activated && (
                        <button
                          onClick={() => handleActivateCard(card.id)}
                          disabled={loading}
                          className="p-2 text-green-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                          title="Activate Card"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        className="p-2 text-purple-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit Perks"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCards.length > 50 && (
          <div className="px-6 py-3 bg-slate-800 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Showing 50 of {filteredCards.length.toLocaleString()} cards. Use search to find specific cards.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Universal Card Search</h2>
        <p className="text-slate-400">Search through all {stats.totalCards.toLocaleString()} cards with Google-style search</p>
      </div>

      <div className="max-w-2xl">
        <SearchComponent
          placeholder="Search by card number, control number, display number, or any format..."
          onSearch={(query) => {
            setSearchQuery(query);
            applyFilter(allCards, 'all');
          }}
          variant="hero"
        />
      </div>

      {searchQuery && (
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Search Results for "{searchQuery}" ({filteredCards.length} found)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.slice(0, 12).map((card) => (
              <div key={card.id} className="border border-slate-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-white">#{card.card_number}</p>
                    <p className="text-sm text-slate-400">Display: {card.display_card_number}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    card.is_activated
                      ? 'bg-green-100 text-green-800'
                      : card.assigned_clinic_id
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {card.is_activated ? 'Activated' : card.assigned_clinic_id ? 'Assigned' : 'Available'}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-white">{card.control_number}</p>
                  <p className="text-xs text-slate-400">{card.unified_control_number}</p>
                </div>

                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => setSelectedCard(card)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredCards.length > 12 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-400">
                Showing 12 of {filteredCards.length} results. Refine search for more specific results.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderRedemptions = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Perk Redemptions</h2>
        <p className="text-slate-400">Manage and track perk redemptions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card-elevated">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Recent Redemptions</h3>
            </div>
            <div className="divide-y divide-slate-700">
              {redemptions.slice(0, 10).map((redemption) => (
                <div key={redemption.id} className="p-6 hover:bg-slate-800 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-white">{redemption.perk_name}</p>
                      <p className="text-sm text-slate-400">
                        Card: {redemption.card?.control_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        Redeemed: {new Date(redemption.claimed_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-400">₱{redemption.perk_value}</p>
                      <p className="text-xs text-slate-500">{redemption.redemption_code}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Redemption Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Today</span>
                <span className="text-white font-semibold">{stats.todayRedemptions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total</span>
                <span className="text-white font-semibold">{stats.totalRedemptions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Value</span>
                <span className="text-green-400 font-semibold">₱{stats.totalPerkValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerks = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Perk Management</h2>
        <p className="text-slate-400">Customize perks for your clinic</p>
      </div>

      <ClinicPerkCustomization
        clinicId={clinicCredentials.clinicId}
        clinicName={clinicCredentials.clinicName}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{clinicCredentials.clinicName}</h1>
              <p className="text-sm text-slate-400">Clinic Code: {clinicCredentials.clinicCode}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Last Updated</p>
              <p className="text-sm text-white">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800 border-b border-slate-700 px-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart },
            { id: 'cards', label: 'Card Management', icon: CreditCard },
            { id: 'search', label: 'Search Cards', icon: Search },
            { id: 'redemptions', label: 'Redemptions', icon: Gift },
            { id: 'perks', label: 'Perks', icon: Award },
            { id: 'settings', label: 'Settings', icon: MapPin }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-4 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-lg text-green-200">
            {success}
          </div>
        )}

        {loading && (
          <div className="mb-6 p-4 bg-blue-900 border border-blue-700 rounded-lg text-blue-200">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
              <span>Loading...</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'cards' && renderCardManagement()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'redemptions' && renderRedemptions()}
        {activeTab === 'perks' && renderPerks()}
        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <p className="text-slate-400">Settings panel coming soon...</p>
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Card Details</h3>
                <p className="text-slate-400">#{selectedCard.card_number}</p>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-2">Card Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-400">Card Number:</span> <span className="text-white">{selectedCard.card_number}</span></p>
                  <p><span className="text-slate-400">Display Number:</span> <span className="text-white">{selectedCard.display_card_number}</span></p>
                  <p><span className="text-slate-400">Control Number:</span> <span className="text-white">{selectedCard.control_number}</span></p>
                  <p><span className="text-slate-400">Unified Format:</span> <span className="text-white">{selectedCard.unified_control_number}</span></p>
                  <p><span className="text-slate-400">Status:</span> <span className="text-white">{selectedCard.status}</span></p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">Perks</h4>
                <div className="space-y-2">
                  {selectedCard.perks?.map((perk) => (
                    <div key={perk.id} className="flex justify-between items-center p-2 bg-slate-700 rounded">
                      <div>
                        <p className="text-white text-sm">{perk.perk_name}</p>
                        <p className="text-slate-400 text-xs">₱{perk.perk_value}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        perk.is_claimed ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                      }`}>
                        {perk.is_claimed ? 'Claimed' : 'Available'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              {selectedCard.assigned_clinic_id === clinicCredentials.clinicId && !selectedCard.is_activated && (
                <button
                  onClick={() => handleActivateCard(selectedCard.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Activate Card
                </button>
              )}

              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
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