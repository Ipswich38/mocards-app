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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="card card-hover p-6">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Card Activation System V2.0</h2>
        <p className="text-gray-600 text-lg">
          Activate unassigned cards and assign location/clinic codes - <span className="text-blue-600 font-medium">{clinicName}</span>
        </p>
      </div>

      {/* Search Section */}
      <div className="card card-hover p-6">
        <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
          <Search className="h-6 w-6 mr-3 text-blue-600" />
          Find Card to Activate
        </h3>

        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by control number or card number (e.g., MOC-__-____-00001 or 1)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="btn btn-primary px-6 py-3 flex items-center disabled:opacity-50"
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
            <h4 className="text-sm font-medium text-gray-700 mb-4">Search Results:</h4>
            <div className="space-y-3">
              {searchResults.map((card) => (
                <div
                  key={card.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedCard?.id === card.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCard(card)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="font-mono text-lg text-gray-800">{card.control_number_v2}</span>
                      <span className="mx-3 text-gray-400">•</span>
                      <span className="text-gray-600">Card #{card.card_number}</span>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
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
        <div className="card card-hover p-6">
          <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
            <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
            Activate Selected Card
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card Info */}
            <div className="space-y-6">
              <div className="border border-gray-200 p-6 rounded-lg bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Selected Card</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Control Number:</span>
                    <span className="font-mono text-blue-600">{selectedCard.control_number_v2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Card Number:</span>
                    <span className="font-mono text-blue-600">#{selectedCard.card_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                      {selectedCard.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border border-blue-200 p-6 rounded-lg bg-blue-50">
                <h4 className="text-sm font-medium text-blue-700 mb-3">New Control Number Preview</h4>
                <div className="font-mono text-2xl text-blue-600 font-bold">
                  {previewControlNumber()}
                </div>
              </div>
            </div>

            {/* Selection Form */}
            <div className="space-y-6">
              {/* Location Code Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <MapPin className="h-5 w-5 inline mr-2 text-blue-600" />
                  Location Code (01-16) *
                </label>
                <select
                  value={selectedLocationCode}
                  onChange={(e) => setSelectedLocationCode(e.target.value)}
                  className="input-field text-lg"
                >
                  <option value="">Select Location Code</option>
                  {locationCodes.map((location) => (
                    <option key={location.id} value={location.code}>
                      {location.code} - {location.region_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Building className="h-5 w-5 inline mr-2 text-blue-600" />
                  Region Type *
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="input-field text-lg"
                >
                  <option value="">Select Region</option>
                  <option value="visayas">Visayas (Cebu)</option>
                  <option value="luzon_4a">Luzon Region 4A (CALABARZON)</option>
                  <option value="ncr">National Capital Region (NCR)</option>
                </select>
              </div>

              {/* Clinic Code Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Building className="h-5 w-5 inline mr-2 text-blue-600" />
                  Clinic Code *
                </label>
                <select
                  value={selectedClinicCode}
                  onChange={(e) => setSelectedClinicCode(e.target.value)}
                  className="input-field text-lg"
                  disabled={!selectedRegion}
                >
                  <option value="">Select Clinic Code</option>
                  {getFilteredClinicCodes().map((clinic) => (
                    <option key={clinic.id} value={clinic.clinic_code}>
                      {clinic.clinic_code} - {clinic.region_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activate Button */}
              <button
                onClick={handleActivateCard}
                disabled={loading || !selectedLocationCode || !selectedClinicCode}
                className="btn w-full px-6 py-4 text-lg font-bold uppercase tracking-wider flex items-center justify-center bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center">
          <AlertCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-center">
          <CheckCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{success}</span>
        </div>
      )}

      {/* Information */}
      <div className="card p-6">
        <div className="border border-blue-200 p-6 rounded-lg bg-blue-50">
          <h4 className="text-lg font-medium text-blue-700 mb-4 flex items-center">
            <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Card Activation Works:
          </h4>
          <ul className="text-gray-700 space-y-2 text-base">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Search for unactivated cards using control number or card number
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Select location code (01-16) corresponding to the region
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Choose region type and specific clinic code
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Card will get new control number: <span className="font-mono text-blue-600">MOC-[location]-[clinic]-[number]</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Default perks will be automatically assigned to activated card
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}