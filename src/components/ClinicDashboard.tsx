import { useState, useEffect } from 'react';
import { dbOperations, Card } from '../lib/supabase';

interface ClinicDashboardProps {
  clinicCredentials: {
    clinicId: string;
    clinicCode: string;
    clinicName: string;
    token: string;
  };
  onBack: () => void;
}

export function ClinicDashboard({ clinicCredentials, onBack }: ClinicDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'redemptions'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchControl, setSearchControl] = useState('');
  const [foundCard, setFoundCard] = useState<Card | null>(null);
  const [clinicCards, setClinicCards] = useState<Card[]>([]);
  const [stats, setStats] = useState({
    activeCards: 0,
    todayRedemptions: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadClinicCards();
    loadStats();
  }, []);

  const loadClinicCards = async () => {
    try {
      const cards = await dbOperations.getClinicCards(clinicCredentials.clinicId);
      setClinicCards(cards);
    } catch (err) {
      console.error('Error loading clinic cards:', err);
    }
  };

  const loadStats = async () => {
    try {
      const cards = await dbOperations.getClinicCards(clinicCredentials.clinicId);
      const activeCards = cards.filter(card => card.status === 'activated').length;

      // Calculate today's redemptions and total value
      let todayRedemptions = 0;
      let totalValue = 0;

      cards.forEach(card => {
        card.perks?.forEach(perk => {
          if (perk.claimed) {
            const claimedDate = new Date(perk.claimed_at || '');
            const today = new Date();
            if (claimedDate.toDateString() === today.toDateString()) {
              todayRedemptions++;
            }
            totalValue += getPerkValue(perk.perk_type);
          }
        });
      });

      setStats({ activeCards, todayRedemptions, totalValue });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const getPerkValue = (perkType: string): number => {
    const values: Record<string, number> = {
      consultation: 500,
      cleaning: 800,
      extraction: 1500,
      fluoride: 300,
      whitening: 2500,
      xray: 1000,
      denture: 3000,
      braces: 5000
    };
    return values[perkType] || 0;
  };

  const handleCardLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFoundCard(null);

    try {
      const card = await dbOperations.getCardByControlNumber(searchControl);

      if (card) {
        setFoundCard(card);
      } else {
        setError('Card not found');
      }
    } catch (err) {
      console.error('Error looking up card:', err);
      setError('Failed to find card');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCard = async (cardId: string) => {
    try {
      await dbOperations.activateCard(cardId, clinicCredentials.clinicId);
      await dbOperations.logTransaction({
        card_id: cardId,
        transaction_type: 'activated',
        performed_by: 'clinic',
        performed_by_id: clinicCredentials.clinicId,
        details: { clinic_name: clinicCredentials.clinicName }
      });

      // Refresh data
      loadClinicCards();
      loadStats();
      setFoundCard(null);
      setSearchControl('');
    } catch (err) {
      console.error('Error activating card:', err);
      setError('Failed to activate card');
    }
  };

  const handleRedeemPerk = async (perkId: string, cardId: string) => {
    try {
      await dbOperations.claimPerk(perkId, clinicCredentials.clinicId);
      await dbOperations.logTransaction({
        card_id: cardId,
        transaction_type: 'perk_claimed',
        performed_by: 'clinic',
        performed_by_id: clinicCredentials.clinicId,
        details: { perk_id: perkId }
      });

      // Refresh data
      loadClinicCards();
      loadStats();
    } catch (err) {
      console.error('Error redeeming perk:', err);
      setError('Failed to redeem perk');
    }
  };

  const getPerkDisplayName = (perkType: string): string => {
    const names: Record<string, string> = {
      consultation: 'Dental Consultation',
      cleaning: 'Dental Cleaning',
      extraction: 'Tooth Extraction',
      fluoride: 'Fluoride Treatment',
      whitening: 'Teeth Whitening',
      xray: 'Dental X-Ray',
      denture: 'Denture Service',
      braces: 'Braces Discount'
    };
    return names[perkType] || perkType;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-50 px-4 py-2 rounded-lg"
            >
              ← Back
            </button>
            <div>
              <div className="text-2xl text-gray-900 tracking-tight">Clinic Portal</div>
              <div className="text-sm text-gray-500">Welcome, {clinicCredentials.clinicName}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cards'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Card Management
            </button>
            <button
              onClick={() => setActiveTab('redemptions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'redemptions'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Redemptions
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Active Cards</div>
                <div className="text-3xl text-gray-900 mb-1">{stats.activeCards}</div>
                <div className="text-sm text-gray-500">Total active patient cards</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Redemptions Today</div>
                <div className="text-3xl text-gray-900 mb-1">{stats.todayRedemptions}</div>
                <div className="text-sm text-gray-500">Perks redeemed today</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Value</div>
                <div className="text-3xl text-gray-900 mb-1">₱{stats.totalValue.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Customer rewards value</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Card Lookup & Activation</h3>
              <form onSubmit={handleCardLookup} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter control number (e.g. MO-C001-001)"
                  value={searchControl}
                  onChange={(e) => setSearchControl(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {foundCard && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Found Card</h3>
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-mono text-lg">{foundCard.control_number}</div>
                      <div className="text-sm text-gray-500">Status: {foundCard.status}</div>
                    </div>
                    {foundCard.status === 'unactivated' && (
                      <button
                        onClick={() => handleActivateCard(foundCard.id)}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                      >
                        Activate Card
                      </button>
                    )}
                  </div>

                  {foundCard.status === 'activated' && foundCard.perks && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-3">Available Perks</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {foundCard.perks.filter(perk => !perk.claimed).map((perk) => (
                          <button
                            key={perk.id}
                            onClick={() => handleRedeemPerk(perk.id, foundCard.id)}
                            className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                          >
                            <div className="font-medium text-blue-900">{getPerkDisplayName(perk.perk_type)}</div>
                            <div className="text-sm text-blue-600">Click to redeem</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Clinic Cards</h3>
              {clinicCards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No cards assigned to your clinic yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicCards.map((card) => (
                    <div key={card.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono">{card.control_number}</div>
                          <div className="text-sm text-gray-500">
                            Status: {card.status} •
                            Activated: {card.activated_at ? new Date(card.activated_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {card.perks?.filter(p => !p.claimed).length || 0} perks available
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'redemptions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Redemptions</h3>
              {clinicCards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No redemptions found.
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicCards.flatMap(card =>
                    card.perks?.filter(perk => perk.claimed).map(perk => (
                      <div key={perk.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{getPerkDisplayName(perk.perk_type)}</div>
                            <div className="text-sm text-gray-500">Card: {card.control_number}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-900">₱{getPerkValue(perk.perk_type)}</div>
                            <div className="text-xs text-gray-400">
                              {perk.claimed_at ? new Date(perk.claimed_at).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    )) || []
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}