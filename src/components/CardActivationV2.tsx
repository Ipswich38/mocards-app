import { useState, useEffect } from 'react';
import { streamlinedOps, Card, LocationCodeV2, ClinicCodeByRegion } from '../lib/streamlined-operations';
import { Search, CheckCircle, AlertCircle, MapPin, Building, CreditCard } from 'lucide-react';

interface CardActivationV2Props {
  clinicId: string;
  clinicName: string;
}

export function CardActivationV2({ clinicId, clinicName }: CardActivationV2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [locationCodes, setLocationCodes] = useState<LocationCodeV2[]>([]);
  const [clinicCodes, setClinicCodes] = useState<ClinicCodeByRegion[]>([]);
  const [selectedLocationCode, setSelectedLocationCode] = useState('');
  const [selectedClinicCode, setSelectedClinicCode] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search results
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadLocationCodes();
    loadClinicCodes();
  }, []);

  const loadLocationCodes = async () => {
    try {
      const codes = await (streamlinedOps as any).getLocationCodesV2();
      setLocationCodes(codes);
    } catch (error) {
      console.error('Error loading location codes:', error);
    }
  };

  const loadClinicCodes = async () => {
    try {
      const codes = await (streamlinedOps as any).getClinicCodesByRegion();
      setClinicCodes(codes);
    } catch (error) {
      console.error('Error loading clinic codes:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');

    try {
      const { cards } = await (streamlinedOps as any).getCardsV2(10, 0, {
        activated: false, // Only unactivated cards
        search: searchQuery
      });

      setSearchResults(cards);

      if (cards.length === 1) {
        setSelectedCard(cards[0]);
      }
    } catch (err: any) {
      setError('Error searching for cards: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleRegionChange = (regionType: string) => {
    setSelectedRegion(regionType);
    setSelectedClinicCode('');
    // Filter clinic codes by region
  };

  const getFilteredClinicCodes = () => {
    if (!selectedRegion) return clinicCodes;
    return clinicCodes.filter(code => code.region_type === selectedRegion);
  };

  const handleActivateCard = async () => {
    if (!selectedCard || !selectedLocationCode || !selectedClinicCode) {
      setError('Please select a card, location code, and clinic code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await (streamlinedOps as any).activateCardV2(
        selectedCard.id,
        selectedLocationCode,
        selectedClinicCode,
        clinicId
      );

      if (success) {
        const newControlNumber = (streamlinedOps as any).generateControlNumberV2(
          selectedCard.card_number || 0,
          selectedLocationCode,
          selectedClinicCode
        );

        setSuccess(`✅ Card activated successfully! New control number: ${newControlNumber}`);

        // Reset form
        setSelectedCard(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedLocationCode('');
        setSelectedClinicCode('');
        setSelectedRegion('');
      } else {
        throw new Error('Failed to activate card');
      }
    } catch (err: any) {
      setError('Error activating card: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const previewControlNumber = () => {
    if (!selectedCard || !selectedLocationCode || !selectedClinicCode) {
      return selectedCard ? `MOC-__-____-${selectedCard.card_number?.toString().padStart(5, '0')}` : '';
    }

    return (streamlinedOps as any).generateControlNumberV2(
      selectedCard.card_number || 0,
      selectedLocationCode,
      selectedClinicCode
    );
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="glass-card animate-float">
        <div className="bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-xl p-8 border border-blue-400/30">
          <h2 className="text-3xl font-bold mb-3 text-slate-100">Card Activation System V2.0</h2>
          <p className="text-blue-200 text-lg">
            Activate unassigned cards and assign location/clinic codes - <span className="text-cyan-300 font-medium">{clinicName}</span>
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="glass-card glass-hover">
        <h3 className="text-xl font-medium text-slate-100 mb-6 flex items-center">
          <Search className="h-6 w-6 mr-3 text-blue-400" />
          Find Card to Activate
        </h3>

        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by control number or card number (e.g., MOC-__-____-00001 or 1)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="glass-button px-6 py-3 flex items-center"
          >
            {searching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Search className="h-5 w-5 mr-2" />
            )}
            Search
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-300 mb-4">Search Results:</h4>
            <div className="space-y-3">
              {searchResults.map((card) => (
                <div
                  key={card.id}
                  className={`glass glass-hover p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    selectedCard?.id === card.id
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-slate-500/30 hover:border-blue-400/50'
                  }`}
                  onClick={() => setSelectedCard(card)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-blue-400 mr-3" />
                      <span className="font-mono text-lg text-slate-200">{card.control_number_v2}</span>
                      <span className="mx-3 text-slate-500">•</span>
                      <span className="text-slate-300">Card #{card.card_number}</span>
                    </div>
                    <span className="glass-badge glass-warning">
                      Unactivated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activation Form */}
      {selectedCard && (
        <div className="glass-card glass-hover animate-float" style={{ animationDelay: '1s' }}>
          <h3 className="text-xl font-medium text-slate-100 mb-6 flex items-center">
            <CheckCircle className="h-6 w-6 mr-3 text-green-400" />
            Activate Selected Card
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card Info */}
            <div className="space-y-6">
              <div className="glass p-6 rounded-xl border border-slate-500/30">
                <h4 className="text-sm font-medium text-slate-300 mb-4">Selected Card</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Control Number:</span>
                    <span className="font-mono text-blue-300">{selectedCard.control_number_v2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Card Number:</span>
                    <span className="font-mono text-cyan-300">#{selectedCard.card_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="glass-badge glass-warning">
                      {selectedCard.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="glass p-6 rounded-xl border border-blue-400/50 bg-blue-500/10">
                <h4 className="text-sm font-medium text-blue-300 mb-3">New Control Number Preview</h4>
                <div className="font-mono text-2xl text-blue-200 font-bold animate-pulse-glow">
                  {previewControlNumber()}
                </div>
              </div>
            </div>

            {/* Selection Form */}
            <div className="space-y-6">
              {/* Location Code Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <MapPin className="h-5 w-5 inline mr-2 text-blue-400" />
                  Location Code (01-16) *
                </label>
                <select
                  value={selectedLocationCode}
                  onChange={(e) => setSelectedLocationCode(e.target.value)}
                  className="glass-input w-full text-lg"
                >
                  <option value="">Select Location Code</option>
                  {locationCodes.map((location) => (
                    <option key={location.id} value={location.code} className="bg-slate-700 text-slate-200">
                      {location.code} - {location.region_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <Building className="h-5 w-5 inline mr-2 text-cyan-400" />
                  Region Type *
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="glass-input w-full text-lg"
                >
                  <option value="">Select Region</option>
                  <option value="visayas" className="bg-slate-700 text-slate-200">Visayas (Cebu)</option>
                  <option value="luzon_4a" className="bg-slate-700 text-slate-200">Luzon Region 4A (CALABARZON)</option>
                  <option value="ncr" className="bg-slate-700 text-slate-200">National Capital Region (NCR)</option>
                </select>
              </div>

              {/* Clinic Code Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <Building className="h-5 w-5 inline mr-2 text-indigo-400" />
                  Clinic Code *
                </label>
                <select
                  value={selectedClinicCode}
                  onChange={(e) => setSelectedClinicCode(e.target.value)}
                  className="glass-input w-full text-lg"
                  disabled={!selectedRegion}
                >
                  <option value="">Select Clinic Code</option>
                  {getFilteredClinicCodes().map((clinic) => (
                    <option key={clinic.id} value={clinic.clinic_code} className="bg-slate-700 text-slate-200">
                      {clinic.clinic_code} - {clinic.region_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activate Button */}
              <button
                onClick={handleActivateCard}
                disabled={loading || !selectedLocationCode || !selectedClinicCode}
                className="glass-button w-full px-6 py-4 text-lg font-bold uppercase tracking-wider flex items-center justify-center"
                style={{
                  background: loading ? 'rgba(16, 185, 129, 0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                  borderColor: '#34d399'
                }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-3" />
                    Activate Card
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="glass glass-error rounded-xl px-6 py-4 flex items-center animate-float">
          <AlertCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{error}</span>
        </div>
      )}

      {success && (
        <div className="glass glass-success rounded-xl px-6 py-4 flex items-center animate-float">
          <CheckCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{success}</span>
        </div>
      )}

      {/* Information */}
      <div className="glass-card">
        <div className="glass p-6 rounded-xl border border-blue-400/30 bg-blue-500/10">
          <h4 className="text-lg font-medium text-blue-300 mb-4 flex items-center">
            <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Card Activation Works:
          </h4>
          <ul className="text-slate-300 space-y-2 text-base">
            <li className="flex items-start">
              <span className="text-blue-400 mr-3">•</span>
              Search for unactivated cards using control number or card number
            </li>
            <li className="flex items-start">
              <span className="text-cyan-400 mr-3">•</span>
              Select location code (01-16) corresponding to the region
            </li>
            <li className="flex items-start">
              <span className="text-indigo-400 mr-3">•</span>
              Choose region type and specific clinic code
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-3">•</span>
              Card will get new control number: <span className="font-mono text-blue-300">MOC-[location]-[clinic]-[number]</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-3">•</span>
              Default perks will be automatically assigned to activated card
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}